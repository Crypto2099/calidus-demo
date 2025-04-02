export const requestAuth = async (calidusKey, poolId) => {
    try {
        console.log('here')
        const response = await fetch(`http://localhost:3050/request-auth`, {
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