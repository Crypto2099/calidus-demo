export const requestAuth = async (calidusKey, poolId) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_SERVICE_API_URL}/request-auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ poolId, calidusKey }),
        });

        if (!response.ok) throw new Error('Failed to get nonce');
        const data = await response.json();
        return data;
    } catch (err) {
        throw new Error(err);
    }
};