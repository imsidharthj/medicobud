import os
import pickle
import pandas as pd
import numpy as np
import networkx as nx
from typing import List, Dict, Any, Optional
from sklearn.tree import DecisionTreeClassifier
from sklearn.calibration import CalibratedClassifierCV

class InterviewService:
    """Enhanced medical interview service with symptom graph and improved questioning logic"""
    
    def __init__(self, 
                 model_path="models/decision_tree.pkl",
                 dataset_path="dataset.csv",
                 relationships_path="data/symptom_relationships.csv"):
        self.model_path = model_path
        self.dataset_path = dataset_path
        self.relationships_path = relationships_path
        self.all_symptoms = []
        self.symptom_graph = nx.DiGraph()
        self.decision_tree = None
        self.sessions: Dict[str, dict] = {}  # Track per-session state
        self.symptom_relationships = {}  # Initialize for _get_related_symptoms_priority
        self.pr_scores = {}  # Cache after first run
        
        self._ensure_dirs_exist()
        self._build_symptom_graph()
        self.load_or_train_model()

    def _ensure_dirs_exist(self):
        """Ensure that necessary directories exist."""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.relationships_path), exist_ok=True)

    def load_or_train_model(self):
        """Load the model and symptom list from disk, otherwise train."""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.decision_tree = model_data['model']
                    self.all_symptoms = model_data['all_symptoms_list']  # Load the symptom list
            except KeyError:  # Handle old model files lacking 'all_symptoms_list'
                self._train_decision_tree()
            except Exception as e:
                print(f"Error loading model: {e}")
                self._train_decision_tree()
        else:
            self._train_decision_tree()
            
    def _train_decision_tree(self):
        """Train a decision tree model and save it with the symptom list."""
        try:
            df = pd.read_csv(self.dataset_path)
            all_symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            
            # Normalize symptoms during extraction
            symptoms_set = set()
            for col in all_symptom_cols:
                # Ensure symptoms are strings, strip whitespace, convert to lowercase
                unique_symptoms_in_col = df[col].dropna().astype(str).str.strip().str.lower().unique()
                symptoms_set.update(s_ for s_ in unique_symptoms_in_col if s_)  # Filter out empty strings after strip
            
            self.all_symptoms = sorted(list(symptoms_set))  # Sort for consistent order

            # Efficiently build feature matrix X
            feature_data = {}
            for symptom_to_check in self.all_symptoms:
                # Normalize row values for comparison
                feature_data[symptom_to_check] = df[all_symptom_cols].apply(
                    lambda row: 1 if symptom_to_check in row.astype(str).str.strip().str.lower().values else 0, axis=1
                )
            X = pd.DataFrame(feature_data)
            
            y = df['Disease']
            base_dt = DecisionTreeClassifier(max_depth=10, min_samples_leaf=5, class_weight='balanced')  # Adjusted parameters
            
            # Determine the minimum number of samples for any class
            min_samples_per_class = y.value_counts().min()
            
            if min_samples_per_class >= 3:
                self.decision_tree = CalibratedClassifierCV(base_dt, method='isotonic', cv=3)
                self.decision_tree.fit(X, y)
            elif min_samples_per_class == 2:
                self.decision_tree = CalibratedClassifierCV(base_dt, method='isotonic', cv=2)
                self.decision_tree.fit(X, y)
            else:  # min_samples_per_class is 1
                base_dt.fit(X, y)
                self.decision_tree = base_dt
            
            # Save both model and the symptom list
            model_data_to_save = {
                'model': self.decision_tree,
                'all_symptoms_list': self.all_symptoms
            }
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            with open(self.model_path, 'wb') as f:
                pickle.dump(model_data_to_save, f)
        except Exception as e:
            print(f"Error training decision tree: {e}")
            self.decision_tree = None
            self.all_symptoms = []  # Ensure it's an empty list on failure

    def _build_symptom_graph(self):
        """Build a symptom relationship graph using co-occurrence and medical knowledge"""
        try:
            df = pd.read_csv(self.dataset_path)
            processed_symptoms_for_graph = set()
            
            # Consistent symptom processing for graph nodes
            if "symptoms" in df.columns:  # If you have a pre-combined 'symptoms' column
                for s_list_str in df['symptoms'].dropna().astype(str):
                    processed_symptoms_for_graph.update([s.strip().lower() for s in s_list_str.split(',') if s.strip()])
            else:  # Using Symptom_X columns
                symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
                for col in symptom_cols:
                    processed_symptoms_for_graph.update([
                        s.strip().lower() 
                        for s in df[col].dropna().astype(str).str.strip().str.lower().unique() 
                        if s.strip().lower()  # Ensure not empty after processing
                    ])
            
            # Ensure all_symptoms (from training) are nodes in the graph if they aren't already
            nodes_to_add = self.all_symptoms if self.all_symptoms else list(processed_symptoms_for_graph)
            if not nodes_to_add:  # If all_symptoms is empty and graph processing also yielded no symptoms
                print("Warning: No symptoms found to build the graph.")
            else:
                self.symptom_graph.add_nodes_from(nodes_to_add)

            co_occur = self._calculate_co_occurrence(df)  # Pass the raw df
            for (s1, s2), count in co_occur.items():
                # Ensure s1 and s2 are in the graph before adding edges
                if self.symptom_graph.has_node(s1) and self.symptom_graph.has_node(s2):
                    self.symptom_graph.add_edge(s1, s2, weight=count, type='co-occurrence')
                    self.symptom_graph.add_edge(s2, s1, weight=count, type='co-occurrence')  # Assuming undirected for co-occurrence
                    self.symptom_relationships.setdefault(s1, []).append(s2)
                    self.symptom_relationships.setdefault(s2, []).append(s1)
            self._add_medical_hierarchy()  # Ensure symptoms here are also normalized
        except Exception as e:
            print(f"Error building symptom graph: {e}")

    def _calculate_pagerank(self, session_id: str):
        """
        Calculate PageRank scores for symptoms and store them for the session.
        The scores are stored as a list of symptoms ordered by PageRank.
        """
        if not self.symptom_graph.nodes:
            print("Symptom graph is empty, cannot calculate PageRank.")
            self.pr_scores[session_id] = []
            return

        try:
            # Get the session state to see what symptoms are already confirmed
            state = self.sessions.get(session_id, {})
            confirmed_symptoms = state.get('confirmed_symptoms', [])
            
            # Create a personalized graph by boosting weights for symptoms related to confirmed ones
            personalized_graph = self.symptom_graph.copy()
            
            if confirmed_symptoms:
                # Boost the importance of symptoms connected to already confirmed symptoms
                for confirmed_symptom in confirmed_symptoms:
                    normalized_confirmed = str(confirmed_symptom).strip().lower()
                    if personalized_graph.has_node(normalized_confirmed):
                        # Increase weights of neighbors of confirmed symptoms
                        neighbors = list(personalized_graph.neighbors(normalized_confirmed))
                        for neighbor in neighbors:
                            if personalized_graph.has_edge(normalized_confirmed, neighbor):
                                current_weight = personalized_graph[normalized_confirmed][neighbor].get('weight', 1.0)
                                # Boost the weight by 3x for related symptoms
                                personalized_graph[normalized_confirmed][neighbor]['weight'] = current_weight * 3.0
                
                # Create a personalization vector that favors symptoms related to confirmed ones
                personalization = {}
                total_nodes = len(personalized_graph.nodes)
                base_prob = 0.1 / total_nodes  # Low base probability
                
                for node in personalized_graph.nodes:
                    personalization[node] = base_prob
                
                # Give higher probability to neighbors of confirmed symptoms
                for confirmed_symptom in confirmed_symptoms:
                    normalized_confirmed = str(confirmed_symptom).strip().lower()
                    if personalized_graph.has_node(normalized_confirmed):
                        neighbors = list(personalized_graph.neighbors(normalized_confirmed))
                        boost_prob = 0.9 / len(neighbors) if neighbors else 0
                        for neighbor in neighbors:
                            personalization[neighbor] = personalization.get(neighbor, base_prob) + boost_prob
                
                # Normalize personalization vector
                total_prob = sum(personalization.values())
                if total_prob > 0:
                    personalization = {k: v/total_prob for k, v in personalization.items()}
            else:
                personalization = None
            
            # Calculate PageRank on the personalized graph
            pagerank_dict = nx.pagerank(
                personalized_graph, 
                weight='weight', 
                alpha=0.85,
                personalization=personalization
            )
            
            # Sort symptoms by PageRank score in descending order
            # Ensure symptoms are strings and normalized
            sorted_symptoms_with_scores = sorted(pagerank_dict.items(), key=lambda item: item[1], reverse=True)
            
            # Filter out already confirmed symptoms from the ranking
            filtered_symptoms = []
            confirmed_normalized = [str(s).strip().lower() for s in confirmed_symptoms]
            
            for symptom, score in sorted_symptoms_with_scores:
                normalized_symptom = str(symptom).strip().lower()
                if normalized_symptom and normalized_symptom not in confirmed_normalized:
                    filtered_symptoms.append(normalized_symptom)
            
            self.pr_scores[session_id] = filtered_symptoms
            
            print(f"Calculated personalized PageRank for session {session_id}. Top 5: {self.pr_scores[session_id][:5]}")

        except Exception as e:
            print(f"Error calculating PageRank: {e}")
            # Fallback: use all_symptoms, sorted alphabetically, excluding confirmed ones
            state = self.sessions.get(session_id, {})
            confirmed_symptoms = [str(s).strip().lower() for s in state.get('confirmed_symptoms', [])]
            
            fallback_symptoms = []
            for s in sorted(self.all_symptoms):
                normalized_s = str(s).strip().lower()
                if normalized_s and normalized_s not in confirmed_symptoms:
                    fallback_symptoms.append(normalized_s)
            
            self.pr_scores[session_id] = fallback_symptoms
            if not fallback_symptoms:
                print("Warning: PageRank fallback also resulted in empty symptom list for session.")

    def _get_next_questions(self, state: dict) -> List[str]:
        """
        Suggest next symptoms to ask about based on PageRank.
        Returns a list of normalized symptom strings to be added to pending_questions.
        """
        session_id = state['session_id']
        
        if session_id not in self.pr_scores:
            self._calculate_pagerank(session_id)

        suggested_symptoms_for_turn = []
        
        if session_id in self.pr_scores and self.pr_scores[session_id]:
            all_ranked_symptoms_for_session = self.pr_scores[session_id]
            current_pr_index = state.get('pr_index', 0)
            
            num_suggestions_wanted = 1 
            
            suggestions_considered = 0
            max_symptoms_to_check = len(all_ranked_symptoms_for_session) # Safety break for loop

            while current_pr_index < len(all_ranked_symptoms_for_session) and \
                  len(suggested_symptoms_for_turn) < num_suggestions_wanted and \
                  suggestions_considered < max_symptoms_to_check:
                
                symptom = all_ranked_symptoms_for_session[current_pr_index].strip().lower() # Ensure normalization
                
                is_in_previous = symptom in state['previous_questions']

                if symptom and not is_in_previous:
                    suggested_symptoms_for_turn.append(symptom)
                
                current_pr_index += 1
                suggestions_considered +=1
            
            state['pr_index'] = current_pr_index
        
        if not suggested_symptoms_for_turn and current_pr_index >= len(self.pr_scores.get(session_id, [])):
            print(f"Session {session_id}: No more new symptoms to ask from PageRank list.")


        return suggested_symptoms_for_turn

    def _calculate_co_occurrence(self, df: pd.DataFrame) -> dict:
        """Calculate symptom co-occurrence frequencies using normalized symptoms"""
        co_occur = {}
        symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
        
        for _, row in df.iterrows():
            current_row_symptoms = set()
            for col in symptom_cols:
                if pd.notna(row[col]):
                    symptom = str(row[col]).strip().lower()
                    if symptom:  # Ensure not empty after normalization
                        current_row_symptoms.add(symptom)
            
            symptoms_list = list(current_row_symptoms)
            for i in range(len(symptoms_list)):
                for j in range(i + 1, len(symptoms_list)):
                    # Ensure pair is always sorted for consistent key
                    s1, s2 = sorted([symptoms_list[i], symptoms_list[j]])
                    pair = (s1, s2)
                    co_occur[pair] = co_occur.get(pair, 0) + 1
        return co_occur

    def _add_medical_hierarchy(self):
        """Add medical knowledge hierarchy (e.g., general -> specific symptoms) using normalized symptoms"""
        medical_hierarchy = {
            'fever': ['high_fever', 'low_grade_fever', 'night_sweats'],  # Ensure these are normalized
            'pain': ['headache', 'chest_pain', 'abdominal_pain'],
            'respiratory': ['cough', 'shortness_of_breath', 'sore_throat']
        }
        for parent_raw, children_raw in medical_hierarchy.items():
            parent = parent_raw.strip().lower()
            if not self.symptom_graph.has_node(parent): 
                self.symptom_graph.add_node(parent)  # Add if missing
            for child_raw in children_raw:
                child = child_raw.strip().lower()
                if not self.symptom_graph.has_node(child): 
                    self.symptom_graph.add_node(child)  # Add if missing
                
                # Add edges only if both nodes exist (they should after the above)
                self.symptom_graph.add_edge(parent, child, weight=2.0, type='hierarchy')
                self.symptom_graph.add_edge(child, parent, weight=0.5, type='hierarchy')  # Optional reverse link

    def _should_stop(self, state: dict) -> bool:
        """Check if we should stop the interview process."""
        confirmed_count = len(state['confirmed_symptoms'])
        # 'previous_questions' should track symptoms for which "Are you experiencing X?" was asked
        asked_count = len(state.get('previous_questions', set())) 

        if confirmed_count >= 5:  # Stop if 5 or more symptoms are confirmed
            return True
        
        # Check if PageRank is exhausted and no pending questions
        is_pagerank_exhausted = False
        if state['session_id'] in self.pr_scores:
            is_pagerank_exhausted = state.get('pr_index', 0) >= len(self.pr_scores[state['session_id']])
        
        if not state.get('pending_questions') and is_pagerank_exhausted and confirmed_count > 0:
            return True
        
        if asked_count >= 10: # Stop after 10 "Are you experiencing X?" type questions
            return True
            
        return False

    def start_interview(self, session_id: str, initial_confirmed_symptoms: Optional[List[str]] = None) -> str:
        """Start a new interview session, optionally with pre-confirmed symptoms."""
        normalized_initial_symptoms = []
        if initial_confirmed_symptoms:
            for s_init in initial_confirmed_symptoms:
                # Ensure normalization matches how symptoms are stored in self.all_symptoms
                norm_s = str(s_init).strip().lower() 
                if norm_s:
                    normalized_initial_symptoms.append(norm_s)

        self.sessions[session_id] = {
            'current_step': 'cross_questioning', # Start directly in cross_questioning
            'confirmed_symptoms': list(set(normalized_initial_symptoms)), # Ensure unique
            'denied_symptoms': [],
            'asked_symptoms': set(normalized_initial_symptoms), # Old set, review usage
            'pending_questions': [],
            'follow_up_responses': {},
            'current_question': None,
            'previous_questions': set(normalized_initial_symptoms), # CRITICAL: Add initial symptoms here
            'person_type': None, # These might come from SessionService state
            'person_details': {},
            'background_traits': {},
            'timing_intensity': {},
            'care_medication': {},
            'session_id': session_id,
            'pr_index': 0,
            # 'asked_follow_ups': set() # Review if this is still needed or can be merged
        }
        # Immediately try to generate the first question based on initial symptoms
        return self.process_input(session_id, "") # Pass empty user_input to trigger question generation

    def process_input(self, session_id: str, user_input: str) -> str:
        """Process user input and generate the next question or response."""
        state = self.sessions.get(session_id)
        if not state:
            return "Session not found. Please start a new interview."

        if state.get('current_question'):
            current_q_dict = state['current_question']
            symptom_asked = current_q_dict['symptom']  # Already normalized when put into current_question

            # (affirmative/negative logic)
            affirmative = user_input.lower() in ['yes', 'y', 'true']  # Example affirmative check
            if affirmative:
                if symptom_asked not in state['confirmed_symptoms']:
                    state['confirmed_symptoms'].append(symptom_asked)
                if symptom_asked in self.symptom_graph:
                    neighbors = list(self.symptom_graph.neighbors(symptom_asked))
                    for neighbor_raw in neighbors:
                        neighbor = str(neighbor_raw).strip().lower()  # Normalize neighbor
                        if neighbor and neighbor not in state['previous_questions']:  # CRITICAL CHECK
                            weight = self.symptom_graph[symptom_asked][neighbor_raw].get('weight', 1.0)
                            # Avoid adding duplicates to pending_questions itself
                            if not any(pq['symptom'] == neighbor for pq in state['pending_questions']):
                                state['pending_questions'].append({
                                    'symptom': neighbor, 'type': 'follow-up', 'weight': weight
                                })
            state['current_question'] = None  # Clear after processing

        # Process initial raw text input if no current_question (e.g., first call after start_interview)
        elif user_input and not state.get('current_question'):  # user_input might be "" on first call
            # (initial symptom parsing logic - ensure parsed symptoms are normalized)
            # Add these parsed and normalized symptoms to state['confirmed_symptoms']
            # AND state['previous_questions']
            pass  # Placeholder for your initial symptom parsing

        if self._should_stop(state):
            state['current_step'] = 'results'
            return self._finalize_diagnosis(state)

        if not state['pending_questions']:
            new_pagerank_symptoms = self._get_next_questions(state)  # Already filters by previous_questions
            for s_new in new_pagerank_symptoms:
                # s_new is already normalized if all_symptoms is normalized
                if not any(pq['symptom'] == s_new for pq in state['pending_questions']):  # Avoid duplicates in pending
                    state['pending_questions'].append({'symptom': s_new, 'type': 'new_from_pagerank', 'weight': 1.0})
        
        state['pending_questions'].sort(key=lambda x: -x.get('weight', 0.0))  # Handle missing weight

        if state['pending_questions']:
            next_q_dict = None
            # Loop to find a question not already asked from pending_questions
            temp_pending = []
            while state['pending_questions']:
                candidate_q = state['pending_questions'].pop(0)
                if candidate_q['symptom'] not in state['previous_questions']:
                    next_q_dict = candidate_q
                    break
                else:  # Symptom already asked, keep it for later if other lists repopulate pending
                    temp_pending.append(candidate_q) 
            
            # Add back non-selected items if any, or if next_q_dict is still None
            state['pending_questions'].extend(temp_pending)
            state['pending_questions'].sort(key=lambda x: -x.get('weight', 0.0))

            if next_q_dict:
                state['previous_questions'].add(next_q_dict['symptom'])  # Add to asked list BEFORE returning
                state['current_question'] = next_q_dict
                
                # For 'follow-up' type from neighbors, the question is about the neighbor itself
                # Detailed questions (how high is fever) come from get_follow_up_questions
                # if next_q_dict.get('type') == 'follow-up-detail': # A new type for specific detail questions
                #    return next_q_dict['question_text'] 
                return f"Are you experiencing {next_q_dict['symptom']}?"
            else:  # No suitable question in pending_questions
                if self._should_stop(state):  # Re-check if stuck and should stop
                    state['current_step'] = 'results'
                    return self._finalize_diagnosis(state)
                return "Do you have any other symptoms you'd like to mention?"  # Fallback
        
        # Fallback if no questions can be generated and not stopping
        if self._should_stop(state):  # Final check
            state['current_step'] = 'results'
            return self._finalize_diagnosis(state)
        return "Is there anything else you're experiencing?"

    def _finalize_diagnosis(self, state: dict) -> str:
        """Finalize the diagnosis based on confirmed symptoms."""
        if not self.decision_tree or not self.all_symptoms:
            return "Model is not available. Cannot provide a diagnosis."

        if not state['confirmed_symptoms']:
            return "No symptoms were confirmed. Cannot provide a diagnosis."

        # Prepare input for the model
        input_features = pd.DataFrame(columns=self.all_symptoms)
        current_symptoms_input = pd.Series([0] * len(self.all_symptoms), index=self.all_symptoms)

        for symptom in state['confirmed_symptoms']:
            normalized_symptom = str(symptom).strip().lower()
            if normalized_symptom in self.all_symptoms:
                current_symptoms_input[normalized_symptom] = 1
        
        input_features = pd.concat([input_features, pd.DataFrame([current_symptoms_input])], ignore_index=True)
        
        # Ensure all columns are present and in the correct order, fill NaNs with 0
        input_features = input_features.reindex(columns=self.all_symptoms, fill_value=0)

        try:
            # Predict probabilities if the model supports it (CalibratedClassifierCV)
            if hasattr(self.decision_tree, "predict_proba"):
                probabilities = self.decision_tree.predict_proba(input_features)[0]
                # Get the top N predictions
                top_n = 3 
                top_classes_indices = np.argsort(probabilities)[-top_n:][::-1]
                
                results = []
                for i in top_classes_indices:
                    disease = self.decision_tree.classes_[i]
                    probability = probabilities[i]
                    if probability > 0.01: # Threshold to show results
                        results.append(f"{disease} (Confidence: {probability:.2f})")
                
                if not results:
                    return "Could not determine a likely diagnosis with sufficient confidence based on the provided symptoms."
                
                diagnosis_str = "Based on your symptoms, potential diagnoses include:\n" + "\n".join(results)
                return diagnosis_str

            else: # Fallback for models without predict_proba (e.g., plain DecisionTreeClassifier)
                prediction = self.decision_tree.predict(input_features)[0]
                return f"Based on your symptoms, the most likely diagnosis is: {prediction}."

        except Exception as e:
            print(f"Error during diagnosis prediction: {e}")
            return "An error occurred while trying to determine the diagnosis."