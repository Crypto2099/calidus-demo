import './App.css';
import { Button, Image, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import { useState } from 'react';
import { requestAuth } from './service/requestAuth';
import { verifySignature } from './service/verifySignature';

function App() {
  const [calidusKey, setCalidusKey] = useState('');
  const [nonceData, setNonceData] = useState(null);
  const [signature, setSignature] = useState('');
  const [poolId, setPoolId] = useState('');
  const [step, setStep] = useState(0);

  const handleRequestAuth = async () => {
    try {
      const response = await requestAuth(calidusKey, poolId);
      if (response) {
        alert('Nonce requested successfully');
      }
      setNonceData(response);
      setStep(1);
    } catch (error) {
      console.error('Error requesting nonce:', error);
      alert('Failed to request nonce');
    }
  }

  const handleVerifySignature = async () => {
    try {
      const response = await verifySignature(calidusKey, signature, nonceData);
      if (response) {
        alert('Signature verified successfully');
      }
    } catch (error) {
      console.error('Error verifying signature:', error);
      alert('Failed to verify signature');
    }
  }

  return (
    <div className="App">
      <Image src={'./FullLogo_Transparent.png'} w={'40vw'} h={"auto"}/>
      <div className='Calidus-Container'>
      {step == 0?
      <>
      <TextInput placeholder="Enter the pool ID" onChange={(e)=> setPoolId(e.target.value)}  w={'100%'}/>
      <TextInput placeholder="Enter you Calidus Key" onChange={(e)=> setCalidusKey(e.target.value)}  w={'100%'}/>
        
        <Button color='violet' w={'100%'} onClick={handleRequestAuth}>
        Request Authentication
        </Button>
      </>
        :
        nonceData && (
        <>
          <TextInput
            type="text"
            placeholder="Paste signature"
            value={nonceData.nonce}
            w={'100%'}
          />
          <TextInput
            type="text"
            placeholder="Paste signature"
            value={nonceData.calidusId}
            w={'100%'}
          />
          <TextInput
            type="text"
            placeholder="Run cardano-signer sign --secret-key calidus.skey --data-hex <nonce>"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            w={'100%'}
          />
          <Button  color='violet' w={'100%'}  onClick={handleVerifySignature}>Verify Signature</Button>
        </>
      )}

      </div>
      
      <div class="glow-background"></div>
    </div>
  );
}

export default App;
