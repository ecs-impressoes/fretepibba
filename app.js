async function buscarCEP() {
    const cepInput = document.getElementById('cep');
    const cepInfo = document.getElementById('cepInfo');

    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) {
        cepInfo.className = 'cep-info';
        cepInfo.innerHTML = '';
        enderecoCompletoDestino = '';
        return;
    }

    try {
        cepInfo.className = 'cep-info ativo';
        cepInfo.innerHTML = '🔍 Buscando endereço...';

        const response = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        const data = await response.json();

        if (data.erro) {
            throw new Error('CEP não encontrado');
        }

        enderecoCompletoDestino =
            `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}, ${data.cep}`;

        cepInfo.className = 'cep-info ativo sucesso';

        cepInfo.innerHTML = `
            <strong>✅ Endereço encontrado:</strong><br>
            ${data.logradouro}<br>
            ${data.bairro} - ${data.localidade}/${data.uf}
        `;

    } catch (error) {

        cepInfo.className = 'cep-info ativo erro';

        cepInfo.innerHTML =
            '<strong>❌ CEP não encontrado</strong>';

        enderecoCompletoDestino = '';
    }
}
