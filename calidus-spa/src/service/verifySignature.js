export const verifySignature = async (nonceData, signature, calidusKey) => {
    try {
      const response = await fetch(`http://localhost:3050/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calidusKey: calidusKey,
          nonce: nonceData.nonce,
          signature: signature
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }
      
      const data = await response.json();
      console.log(data)
      return data;
    } catch (err) {
      console.error('Error verifying signature:', err);
      throw err;
    }
  };