// Configuração da API - Tenta backend, senão usa ViaCEP direto
const API_URL = 'http://localhost:3000/api';
const VIACEP_URL = 'https://viacep.com.br/ws';

// Variáveis globais
let map;
let markerOrigem;
let markerDestino;
let rotaLine;
let enderecoCompletoDestino = '';

const ORIGEM = {
    endereco: "Av. Brasil, 284, Jardim Casqueiro, Cubatão, SP",
    coords: [-23.8759, -46.5175]
};

const CHAVE_PIX = "13988089754";
const NOME_MERCHANT = "FRETE CUBATAO";
const CIDADE_MERCHANT = "CUBATAO";

// Inicializar mapa
function initMap() {
    map = L.map('map').setView(ORIGEM.coords, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Marcador de origem
    markerOrigem = L.marker(ORIGEM.coords)
        .addTo(map)
        .bindPopup('<b>Origem:</b> Av. Brasil, 284<br>Cubatão - SP')
        .openPopup();
}

// Buscar CEP - COM FALLBACK
async function buscarCEP() {
    const cepInput = document.getElementById('cep');
    const cepInfo = document.getElementById('cepInfo');
    let cep = cepInput.value.replace(/\D/g, '');
    
    // Limpa informações anteriores
    cepInfo.className = 'cep-info';
    cepInfo.innerHTML = '';
    enderecoCompletoDestino = '';
    
    if (cep.length !== 8) {
        if (cep.length > 0) {
            cepInfo.className = 'cep-info ativo erro';
            cepInfo.innerHTML = '<strong>❌ CEP deve ter 8 dígitos</strong>';
        }
        return;
    }
    
    // Mostra loading
    cepInfo.className = 'cep-info ativo';
    cepInfo.innerHTML = '<span>🔍 Buscando endereço...</span>';
    
    try {
        // Tenta primeiro o backend
        let data;
        let usouBackend = false;
        
        try {
            const response = await fetch(`${API_URL}/cep/${cep}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            if (response.ok) {
                data = await response.json();
                usouBackend = true;
                console.log('CEP buscado via backend:', data);
            } else {
                throw new Error('Backend indisponível');
            }
        } catch (backendError) {
            console.log('Backend falhou, usando ViaCEP direto:', backendError);
            // Fallback: ViaCEP direto
            const viaCepResponse = await fetch(`${VIACEP_URL}/${cep}/json/`, {
                timeout: 5000
            });
            data = await viaCepResponse.json();
            console.log('CEP buscado via ViaCEP direto:', data);
        }
        
        // Verifica se CEP foi encontrado
        if (data.erro || !data.found) {
            cepInfo.className = 'cep-info ativo erro';
            cepInfo.innerHTML = '<strong>❌ CEP não encontrado</strong>';
            enderecoCompletoDestino = '';
            return;
        }
        
        // CEP encontrado com sucesso
        enderecoCompletoDestino = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}, ${data.cep}`;
        
        cepInfo.className = 'cep-info ativo sucesso';
        cepInfo.innerHTML = `
            <strong>✅ Endereço encontrado:</strong><br>
            <strong>${data.logradouro}</strong><br>
            ${data.bairro}<br>
            ${data.localidade}/${data.uf}
        `;
        
        // Preenche número automaticamente se estiver vazio
        const numeroInput = document.getElementById('numero');
        if (!numeroInput.value.trim()) {
            numeroInput.focus();
        }
        
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        cepInfo.className = 'cep-info ativo erro';
        cepInfo.innerHTML = `
            <strong>❌ Erro ao buscar CEP</strong><br>
            <small>${error.message}</small>
        `;
        enderecoCompletoDestino = '';
    }
}

// Calcular rota
async function calcularRota() {
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    const numero = document.getElementById('numero').value.trim();
    const tipoViagem = document.getElementById('tipoViagem').value;
    const loading = document.getElementById('loading');
    const resultado = document.getElementById('resultado');
    const mensagemInicial = document.getElementById('mensagemInicial');
    
    // Validações
    if (cep.length !== 8) {
        alert('Por favor, informe um CEP válido com 8 dígitos.');
        return;
    }
    
    if (!numero) {
        alert('Por favor, informe o número da casa/prédio.');
        document.getElementById('numero').focus();
        return;
    }
    
    if (!enderecoCompletoDestino) {
        alert('CEP não encontrado. Por favor, verifique o CEP informado.');
        document.getElementById('cep').focus();
        return;
    }
    
    loading.classList.add('ativo');
    resultado.classList.remove('ativo');
    
    try {
        const destinoCompleto = `${enderecoCompletoDestino}, ${numero}`;
        console.log('Calculando rota para:', destinoCompleto);
        
        // Chamar API do backend
        const response = await fetch(
            `${API_URL}/directions?origin=${encodeURIComponent(ORIGEM.endereco)}&destination=${encodeURIComponent(destinoCompleto)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao calcular rota');
        }
        
        const data = await response.json();
        console.log('Rota calculada:', data);
        
        // Calcular valores
        let distanciaKm = data.distance.value / 1000;
        const tempoMinutos = Math.round(data.duration.value / 60);
        
        if (tipoViagem === 'ida-volta') {
            distanciaKm *= 2;
        }
        
        const valorTotal = distanciaKm * 2.00;
        const enderecoParaExibicao = `Nº ${numero}, ${enderecoCompletoDestino}`;
        
        // Atualizar interface
        document.getElementById('enderecoDestino').textContent = enderecoParaExibicao;
        document.getElementById('distancia').textContent = distanciaKm.toFixed(2);
        document.getElementById('tempo').textContent = tempoMinutos;
        document.getElementById('tipoTexto').textContent = tipoViagem === 'ida' ? 'Apenas Ida' : 'Ida e Volta';
        document.getElementById('valorTotal').textContent = formatarMoeda(valorTotal);
        document.getElementById('pixValor').textContent = formatarMoeda(valorTotal);
        
        // Atualizar mapa
        atualizarMapa(data);
        
        // Gerar QR Code
        gerarQRCodePIX(valorTotal, enderecoParaExibicao);
        
        // Mostrar resultado
        mensagemInicial.style.display = 'none';
        resultado.classList.add('ativo');
        
        // Scroll para o resultado
        resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        console.error('Erro ao calcular rota:', error);
        alert('Erro ao calcular rota: ' + error.message + '\n\nVerifique se:\n1. O backend está rodando\n2. O endereço de destino é válido\n3. Sua chave do Google Maps está configurada');
    } finally {
        loading.classList.remove('ativo');
    }
}

// Atualizar mapa
function atualizarMapa(rotaData) {
    // Limpar marcadores e rotas anteriores
    if (markerDestino) map.removeLayer(markerDestino);
    if (rotaLine) map.removeLayer(rotaLine);
    
    // Decodificar polyline
    const pontos = decodePolyline(rotaData.polyline);
    
    // Desenhar rota
    rotaLine = L.polyline(pontos, {
        color: '#667eea',
        weight: 4,
        opacity: 0.8
    }).addTo(map);
    
    // Adicionar marcador de destino
    const destinoCoords = pontos[pontos.length - 1];
    markerDestino = L.marker(destinoCoords)
        .addTo(map)
        .bindPopup('<b>Destino</b>');
    
    // Ajustar zoom
    map.fitBounds(rotaLine.getBounds(), { padding: [50, 50] });
}

// Decodificar polyline do Google Maps
function decodePolyline(encoded) {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    
    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        points.push([lat / 1E5, lng / 1E5]);
    }
    
    return points;
}

// Gerar QR Code PIX
function gerarQRCodePIX(valor, descricao) {
    document.getElementById('qrcode').innerHTML = '';
    const payloadPIX = gerarPayloadPIX(valor, descricao);
    
    new QRCode(document.getElementById('qrcode'), {
        text: payloadPIX,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
}

// Gerar payload PIX
function gerarPayloadPIX(valor, descricao) {
    const txid = 'FRETE' + Date.now();
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    
    function crc16(payload) {
        let crc = 0xFFFF;
        const polynomial = 0x1021;
        
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ polynomial : crc << 1;
            }
        }
        
        crc = crc & 0xFFFF;
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }
    
    let payload = '';
    payload += '000201';
    
    const gui = 'br.gov.bcb.pix';
    const merchantInfo = `0014${gui}01${CHAVE_PIX.length.toString().padStart(2, '0')}${CHAVE_PIX}`;
    payload += `26${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`;
    
    payload += '52040000';
    payload += '5303986';
    payload += `54${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}`;
    payload += '5802BR';
    
    const nome = NOME_MERCHANT.substring(0, 25);
    payload += `59${nome.length.toString().padStart(2, '0')}${nome}`;
    
    const cidade = CIDADE_MERCHANT.substring(0, 15);
    payload += `60${cidade.length.toString().padStart(2, '0')}${cidade}`;
    
    const txidField = `05${txid.length.toString().padStart(2, '0')}${txid}`;
    payload += `62${txidField.length.toString().padStart(2, '0')}${txidField}`;
    
    payload += '6304';
    payload += crc16(payload);
    
    return payload;
}

// Format moeda
function formatarMoeda(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const cepInput = document.getElementById('cep');
    
    // Máscara de CEP
    cepInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }
        e.target.value = value;
    });
    
    // Busca CEP ao perder o foco
    cepInput.addEventListener('blur', buscarCEP);
    
    // Permite buscar CEP ao pressionar Enter
    cepInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarCEP();
            document.getElementById('numero').focus();
        }
    });
});

// Inicializar
window.onload = initMap;
