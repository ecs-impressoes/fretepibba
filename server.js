// Rota para buscar endereço por CEP (ViaCEP)
app.get('/api/cep/:cep', async (req, res) => {
    try {
        const { cep } = req.params;
        const cepLimpo = cep.replace(/\D/g, '');
        
        console.log(`Buscando CEP: ${cepLimpo}`);
        
        if (cepLimpo.length !== 8) {
            return res.status(400).json({ 
                error: 'CEP deve ter 8 dígitos',
                found: false
            });
        }
        
        // ViaCEP API
        const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
            timeout: 5000
        });
        
        const data = response.data;
        
        if (data.erro) {
            console.log('CEP não encontrado:', cepLimpo);
            return res.status(404).json({ 
                error: 'CEP não encontrado',
                found: false
            });
        }
        
        console.log('CEP encontrado:', data);
        res.json({
            ...data,
            found: true
        });
        
    } catch (error) {
        console.error('Erro ao buscar CEP:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            return res.status(500).json({ 
                error: 'Timeout ao consultar CEP. Tente novamente.',
                found: false
            });
        }
        
        res.status(500).json({ 
            error: 'Erro ao consultar CEP',
            details: error.message,
            found: false
        });
    }
});
