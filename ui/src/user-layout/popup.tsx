import { 
  Modal, 
  Button, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material'; // Assuming you're using Material UI

interface SymptomSessionData {
  session_date: string;
  symptoms: string[];
  diagnosis: string | string[];
  notes?: string;
  symptom_image_url?: string;
  // other fields as needed
}

interface SymptomSessionModalProps {
  open: boolean;
  onClose: () => void;
  sessionData: SymptomSessionData | null;
  loading: boolean;
}

const SymptomSessionModal: React.FC<SymptomSessionModalProps> = ({ open, onClose, sessionData, loading }) => {
  if (!sessionData && !loading) return null;
  
  // Create a safe local copy with default values
  const safeData = sessionData || {
    session_date: '',
    symptoms: [],
    diagnosis: [],
    notes: '',
    symptom_image_url: ''
  };
  
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="symptom-session-modal-title"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 24,
        p: 4,
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography id="symptom-session-modal-title" variant="h6" component="h2" gutterBottom>
              Symptom Session Results
            </Typography>
            
            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
              Date: {new Date(safeData.session_date).toLocaleDateString()}
            </Typography>
            
            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
              Symptoms Reported:
            </Typography>
            <List dense>
              {safeData.symptoms.map((symptom, index) => (
                <ListItem key={index}>
                  <ListItemText primary={`• ${symptom}`} />
                </ListItem>
              ))}
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Diagnosis:
            </Typography>
            {Array.isArray(safeData.diagnosis) && safeData.diagnosis.length > 0 ? (
              <List dense>
                {safeData.diagnosis.map((disease, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`• ${disease}`} 
                      sx={{
                        color: disease.includes('No diseases found') ? 'warning.main' : 'text.primary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : typeof safeData.diagnosis === 'string' ? (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {safeData.diagnosis}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                No diagnosis available
              </Typography>
            )}
            
            {safeData.notes && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                  Notes:
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {safeData.notes}
                </Typography>
              </>
            )}
            
            {safeData.symptom_image_url && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                  Uploaded Image:
                </Typography>
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                  <img 
                    src={safeData.symptom_image_url} 
                    alt="Symptom visual" 
                    style={{ maxWidth: '100%', maxHeight: '200px' }} 
                  />
                </Box>
              </>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={onClose} variant="contained">
                Close
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default SymptomSessionModal;