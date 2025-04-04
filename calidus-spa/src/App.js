import './App.css';
import { Button, Image, TextInput, Tooltip, ActionIcon, CopyButton, CheckIcon } from '@mantine/core';
import '@mantine/core/styles.css';
import { useState, useEffect } from 'react';
import { requestAuth } from './service/requestAuth';
import { verifySignature } from './service/verifySignature'
import { notifications } from '@mantine/notifications';

function App() {
  const [calidusKey, setCalidusKey] = useState('');
  const [nonceData, setNonceData] = useState(null);
  const [signature, setSignature] = useState('');
  const [poolId, setPoolId] = useState('');
  const [step, setStep] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState('');

  // Load saved state on component mount
  useEffect(() => {
    const savedNonceData = localStorage.getItem('nonceData');
    const savedStep = localStorage.getItem('authStep');
    
    if (savedNonceData) {
      setNonceData(JSON.parse(savedNonceData));
    }
    
    if (savedStep) {
      setStep(parseInt(savedStep, 10));
    }
  }, []);

  const handleRequestAuth = async () => {
    try {
      const response = await requestAuth(calidusKey, poolId);
      if (response) {

        notifications.show({
          title: 'Successfully requested nonce',
          color: 'green',
          message: 'Please copy the nonce and sign it using your signature',
        })
        // Save to localStorage
        localStorage.setItem('nonceData', JSON.stringify(response));
        localStorage.setItem('authStep', '1');
        
        setNonceData(response);
        setStep(1);
      }
    } catch (error) {
      console.error('Error requesting nonce:', error);
      alert('Failed to request nonce: ' + (error.message || 'Unknown error'));
    }
  }

  const handleVerifySignature = async () => {
    console.log(nonceData)    
    if (!nonceData || !nonceData.nonce || !nonceData.calidusId) {
      alert('Nonce data is invalid or expired. Please request a new nonce.');
      handleReset();
      return;
    }

    try {
      setVerificationStatus('');
      const response = await verifySignature(nonceData, signature, nonceData.calidusId);
      setVerificationStatus('success');
      alert(response.message || 'Verification successful!');
      
      // Clear storage after successful verification
      localStorage.removeItem('nonceData');
      localStorage.removeItem('authStep');
    } catch (error) {
      console.error('Error verifying signature:', error);
      setVerificationStatus('error');
      alert(error.message || 'Verification failed');
      
      // If the error indicates an expired or invalid nonce, reset the form
      if (error.message && (error.message.includes('expired') || error.message.includes('Invalid'))) {
        handleReset();
      }
    }
  }

  const handleReset = () => {
    setStep(0);
    setNonceData(null);
    setSignature('');
    setVerificationStatus('');
    localStorage.removeItem('nonceData');
    localStorage.removeItem('authStep');
  }

  return (
    <div className="App">
      <Image src={'./FullLogo_Transparent.png'} w={'30vw'} h={"auto"}/>
      <div className='Calidus-Container'>
      {step === 0 ?
      <>
      <TextInput placeholder="Enter the pool ID" value={poolId} onChange={(e)=> setPoolId(e.target.value)} w={'100%'}/>
      <TextInput placeholder="Enter your Calidus Key" value={calidusKey} onChange={(e)=> setCalidusKey(e.target.value)} w={'100%'}/>
        
        <Button color='violet' w={'100%'} onClick={handleRequestAuth}>
        Request Authentication
        </Button>
      </>
        :
        nonceData && (
        <>
          <TextInput
            type="text"
            placeholder="Nonce (copy this value)"
            value={nonceData.nonce}
            rightSection={
              <CopyButton value={nonceData.nonce} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                  <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                    <Image src={'./clipboard-copy.svg'} w={24} h={24}/>
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
            }
            readOnly
            w={'100%'}
          />
          <TextInput
            type="text"
            placeholder="Run cardano-signer sign --secret-key calidus.skey --data-hex <nonce>"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            w={'100%'}
          />
          <Button 
            color={verificationStatus === 'success' ? 'green' : verificationStatus === 'error' ? 'red' : 'violet'} 
            w={'100%'} 
            onClick={handleVerifySignature}
            mb={10}
          >
            Verify Signature
          </Button>
          <Button 
            variant="outline" 
            color="gray" 
            w={'100%'} 
            onClick={handleReset}
          >
            Reset
          </Button>
        </>
      )}

      </div>
      
      <div className="glow-background"></div>
    </div>
  );
}

export default App;
