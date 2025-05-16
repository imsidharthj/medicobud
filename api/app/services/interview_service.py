import os
import pickle
import pandas as pd
import numpy as np
import networkx as nx
from typing import List, Dict, Any
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
        self.sessions = {}
        
        self._ensure_dirs_exist()
        self._build_symptom_graph()
        self.load_or_train_model()

    def _ensure_dirs_exist(self):
        """Ensure that necessary directories exist."""
        import os
        
        # Extract directory paths from the file paths
        model_dir = os.path.dirname(self.model_path)
        relationships_dir = os.path.dirname(self.relationships_path)
        
        # Create directories if they don't exist
        if model_dir and not os.path.exists(model_dir):
            os.makedirs(model_dir, exist_ok=True)
        
        if relationships_dir and not os.path.exists(relationships_dir):
            os.makedirs(relationships_dir, exist_ok=True)

    def load_or_train_model(self):
        """Load the model from disk if it exists, otherwise train a new one."""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.decision_tree = pickle.load(f)
                print(f"Loaded decision tree model from {self.model_path}")
            except Exception as e:
                print(f"Error loading model: {e}")
                self._train_decision_tree()
        else:
            print(f"Model not found at {self.model_path}. Training new model.")
            self._train_decision_tree()
            
    def _train_decision_tree(self):
        """Train a decision tree model for symptom prediction."""
        try:
            # Read the dataset
            df = pd.read_csv(self.dataset_path)
            
            # Extract unique symptoms and diseases
            all_symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            all_symptoms = set()
            for col in all_symptom_cols:
                symptoms = df[col].dropna().unique()
                all_symptoms.update(symptoms)
            
            self.all_symptoms = list(all_symptoms)
            
            # Create feature matrix (one-hot encoding of symptoms)
            X = pd.DataFrame()
            for symptom in self.all_symptoms:
                X[symptom] = df[all_symptom_cols].apply(
                    lambda row: 1 if symptom in row.values else 0, axis=1
                )
            
            # Create target variable (disease)
            y = df['Disease']
            
            # Train a decision tree model
            base_dt = DecisionTreeClassifier(max_depth=5)
            self.decision_tree = CalibratedClassifierCV(base_dt)
            self.decision_tree.fit(X, y)
            
            # Save the model
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.decision_tree, f)
                
            print(f"Decision tree model trained and saved to {self.model_path}")
            
        except Exception as e:
            print(f"Error training decision tree: {e}")
            # Initialize a dummy model that won't crash the system
            self.decision_tree = None

    def _build_symptom_graph(self):
        """Build a symptom relationship graph using co-occurrence and medical knowledge"""
        try:
            df = pd.read_csv(self.dataset_path)
            
            # Create nodes with base information
            symptoms = set()
            if "symptoms" in df.columns:
                for s_list in df['symptoms'].str.split(','):
                    symptoms.update([s.strip() for s in s_list])
            else:
                symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
                for col in symptom_cols:
                    symptoms.update([s.strip() for s in df[col].dropna().unique()])
            
            self.symptom_graph.add_nodes_from(symptoms)
            
            # Create edges with weights
            co_occur = self._calculate_co_occurrence(df)
            for (s1, s2), count in co_occur.items():
                self.symptom_graph.add_edge(s1, s2, weight=count, type='co-occurrence')
                self.symptom_graph.add_edge(s2, s1, weight=count, type='co-occurrence')
                
            # Add medical hierarchy relationships
            self._add_medical_hierarchy()
            
        except Exception as e:
            print(f"Error building symptom graph: {e}")

    def _calculate_co_occurrence(self, df: pd.DataFrame) -> dict:
        """Calculate symptom co-occurrence frequencies"""
        co_occur = {}
        if "Disease" in df.columns:
            for _, row in df.iterrows():
                symptoms = set()
                symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
                for col in symptom_cols:
                    if pd.notna(row[col]):
                        symptoms.add(row[col].strip())
                
                symptoms = list(symptoms)
                for i in range(len(symptoms)):
                    for j in range(i+1, len(symptoms)):
                        pair = tuple(sorted([symptoms[i], symptoms[j]]))
                        co_occur[pair] = co_occur.get(pair, 0) + 1
        return co_occur

    def _add_medical_hierarchy(self):
        """Add medical knowledge hierarchy (e.g., general -> specific symptoms)"""
        medical_hierarchy = {
            'fever': ['high_fever', 'low_grade_fever', 'night_sweats'],
            'pain': ['headache', 'chest_pain', 'abdominal_pain'],
            'respiratory': ['cough', 'shortness_of_breath', 'sore_throat']
        }
        for parent, children in medical_hierarchy.items():
            for child in children:
                if child in self.symptom_graph:
                    self.symptom_graph.add_edge(parent, child, weight=2.0, type='hierarchy')
                    self.symptom_graph.add_edge(child, parent, weight=0.5, type='hierarchy')

    def _get_next_questions(self, state: dict) -> List[str]:
        """Get the most relevant next questions using graph-based ranking"""
        confirmed = state['confirmed_symptoms']
        asked = state['asked_symptoms']
        
        # Calculate personalized page rank
        personalization = {s: 1.0 for s in confirmed}
        ranks = nx.pagerank(self.symptom_graph, personalization=personalization)
        
        # Filter and sort candidates
        candidates = [(s, score) for s, score in ranks.items() 
                     if s not in asked and s not in confirmed]
        candidates.sort(key=lambda x: -x[1])
        
        # Return top 3 questions
        return [s for s, _ in candidates[:3]]

    def process_input(self, session_id: str, user_input: str) -> str:
        """Improved input processing with graph-based questioning"""
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        
        state = self.sessions[session_id]
        response = user_input.strip().lower()
        
        # Handle current question response
        if state['current_question']:
            symptom = state['current_question']['symptom']
            if response in ["yes", "y"]:
                state['confirmed_symptoms'].append(symptom)
                # Add follow-ups from graph neighbors
                neighbors = self.symptom_graph.neighbors(symptom)
                for neighbor in neighbors:
                    if neighbor not in state['asked_symptoms']:
                        state['pending_questions'].append({
                            'symptom': neighbor,
                            'type': 'follow-up',
                            'weight': self.symptom_graph[symptom][neighbor]['weight']
                        })
            elif response in ["no", "n"]:
                state['denied_symptoms'].append(symptom)
            
            state['asked_symptoms'].add(symptom)
            state['current_question'] = None

        # Process initial input
        else:
            initial_symptoms = [s.strip() for s in user_input.split(',')]
            for s in initial_symptoms:
                if s in self.symptom_graph:
                    state['confirmed_symptoms'].append(s)
                    state['asked_symptoms'].add(s)
        
        # Check early stopping
        if self._should_stop(state):
            return self._finalize_diagnosis(state)
        
        # Get next questions
        if not state['pending_questions']:
            new_questions = self._get_next_questions(state)
            state['pending_questions'].extend([
                {'symptom': s, 'type': 'new', 'weight': 1.0} 
                for s in new_questions 
                if s not in state['asked_symptoms']
            ])
        
        # Sort and select next question
        state['pending_questions'].sort(key=lambda x: -x['weight'])
        if state['pending_questions']:
            next_q = state['pending_questions'].pop(0)
            
            if next_q['symptom'] in state['previous_questions']:
                # Find another question that hasn't been asked before
                for i, q in enumerate(state['pending_questions']):
                    if q['symptom'] not in state['previous_questions']:
                        next_q = state['pending_questions'].pop(i)
                        break

            state['previous_questions'].add(next_q['symptom'])
            state['current_question'] = next_q
            return f"Are you experiencing {next_q['symptom']}?"
        
        return "Do you have any other symptoms to report?"

    def _should_stop(self, state: dict) -> bool:
        """Check if we should stop the interview process based on the current state."""
        # Stop if we have at least 3 confirmed symptoms
        if len(state['confirmed_symptoms']) >= 3:
            return True
            
        # Stop if we have a high confidence prediction already
        if len(state['confirmed_symptoms']) > 0:
            return self._should_stop_early(state['confirmed_symptoms'])
            
        # Otherwise, continue the interview
        return False

    def _should_stop_early(self, confirmed_symptoms: List[str]) -> bool:
        """Check if we have enough evidence to stop early."""
        X = self._symptoms_to_vector(confirmed_symptoms)
        if X is not None and self.decision_tree:
            proba = self.decision_tree.predict_proba(X)
            if np.max(proba) >= 0.8:  # Threshold for confidence
                return True
        return False

    def _symptoms_to_vector(self, symptoms: List[str]):
        """Convert a list of symptoms to a feature vector for prediction."""
        if not self.all_symptoms:
            return None
            
        X = np.zeros((1, len(self.all_symptoms)))
        for symptom in symptoms:
            if symptom in self.all_symptoms:
                X[0, self.all_symptoms.index(symptom)] = 1
                
        return X

    def _finalize_diagnosis(self, state: dict) -> str:
        state['current_question'] = None
        # Prepare diagnosis results
        return "We have enough information to proceed with the diagnosis."
    
    def get_next_question(self, current_symptoms: List[str]) -> str:
        """Generate the next most informative question based on current symptoms"""
        if not current_symptoms:
            return "What symptoms are you experiencing?"
        
        if not self.decision_tree or not self.all_symptoms:
            return "Could you tell me more about your symptoms?"
        
        try:
            X = np.zeros((1, len(self.all_symptoms)))
            for symptom in current_symptoms:
                if symptom in self.all_symptoms:
                    X[0, self.all_symptoms.index(symptom)] = 1
            
            importances = self.decision_tree.feature_importances_
            candidates = [(self.all_symptoms[i], importances[i]) 
                          for i in range(len(self.all_symptoms))
                          if self.all_symptoms[i] not in current_symptoms]
            
            sorted_candidates = sorted(candidates, key=lambda x: x[1], reverse=True)
            if sorted_candidates:
                next_symptom = sorted_candidates[0][0]
                return f"Are you experiencing {next_symptom}?"
            else:
                return "Any other symptoms that you want to mention?"
        except Exception as e:
            print(f"Error generating next question: {e}")
            return "What other symptoms are you experiencing?"
    
    def get_follow_up_questions(self, symptom: str, confirmed_symptoms: List[str]) -> List[tuple]:
        """Generate follow-up questions with priority scores."""
        # Define predefined follow-ups as a dictionary in the method
        predefined_follow_ups = {
            "fever": [
                "How high is your temperature?",
                "Do you have chills or sweats with the fever?"
            ],
            "headache": [
                "Is the headache concentrated in a specific area?",
                "Is it a constant or throbbing pain?"
            ],
            # Add other symptom follow-ups...
        }
        
        predefined = predefined_follow_ups.get(symptom, [])
        related_symptoms = self._get_related_symptoms_priority(confirmed_symptoms)
        # Convert related symptoms to questions with scores
        related_questions = [(f"Are you also experiencing {rs}?", score) for rs, score in related_symptoms]
        # Predefined questions get higher priority (score=1.0)
        predefined_with_scores = [(q, 1.0) for q in predefined]
        return predefined_with_scores + related_questions

    def _get_related_symptoms_priority(self, confirmed_symptoms: List[str]) -> List[tuple]:
        """Get related symptoms sorted by priority based on confirmed symptoms."""
        symptom_scores = {}
        for s in confirmed_symptoms:
            related = self.symptom_relationships.get(s, [])
            for idx, rs in enumerate(related):
                if rs in self.all_symptoms:
                    # Calculate score: sum(1/(rank+1) for each occurrence
                    rank_score = 1 / (idx + 1)
                    feature_score = self.decision_tree.feature_importances_[self.all_symptoms.index(rs)]
                    total_score = rank_score * feature_score
                    symptom_scores[rs] = symptom_scores.get(rs, 0) + total_score
        # Sort by score descending
        return sorted(symptom_scores.items(), key=lambda x: x[1], reverse=True)
    
    def get_symptom_list(self) -> List[str]:
        """Return the list of all symptoms the model knows about"""
        return self.all_symptoms
        
    def format_interview_results(self, session_id: str) -> Dict[str, Any]:
        """Format the collected symptoms for display or further processing"""
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        
        state = self.sessions[session_id]
        symptoms = state['confirmed_symptoms']
        return {
            "collected_symptoms": symptoms,
            "denied_symptoms": state['denied_symptoms'],
            "symptom_count": len(symptoms),
            "follow_up_responses": state['follow_up_responses'],
            "ready_for_diagnosis": len(symptoms) >= 3,
            "next_question": state['current_question'] if len(symptoms) < 3 else None
        }

    def start_interview(self, session_id: str) -> str:
        """Start a new interview session"""
        self.sessions[session_id] = {
            'confirmed_symptoms': [],
            'denied_symptoms': [],
            'asked_symptoms': set(),
            'pending_questions': [],
            'follow_up_responses': {},
            'current_question': None,
            'previous_questions': set(),  # Track previous questions to avoid repetition
        }
        return "What symptoms are you experiencing?"