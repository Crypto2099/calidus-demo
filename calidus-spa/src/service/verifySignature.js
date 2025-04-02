export const verifySignature = async (calidusKey, nonceData, signature) => {
    try {
      const response = await fetch(`http://localhost:3050/verify-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calidusKey,
          nonce: nonceData?.nonce,
          signature,
        }),
      });

      if (!response.ok) throw new Error('Verification failed');
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(err);
        throw new Error(err);
    }
  };