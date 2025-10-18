// js/plan.js
import * as dom from './dom.js';
import * as state from './state.js';
import { drawCompleteProfileOnCanvas } from './canvas.js';

/**
 * Calcula a largura inicial e final total com base nos perfis desenhados.
 * @returns {{somasInicio: number, somasFim: number}}
 */
function getInitialProfileWidths() {
    let somasInicio = 0;
    let somasFim = 0;
    state.profiles.forEach(p => {
        p.segments.forEach(seg => {
            if (seg.measurement) {
                const value = parseFloat(seg.measurement.text);
                if (!isNaN(value)) {
                    if (seg.measurement.type === 'variable_start') {
                        somasInicio += value;
                    } else if (seg.measurement.type === 'variable_end') {
                        somasFim += value;
                    } else if (seg.measurement.type === 'static') {
                        somasInicio += value;
                        somasFim += value;
                    }
                }
            }
        });
    });
    return { somasInicio, somasFim };
}

// ==============================================================================
// --- LÓGICA DE CORTE E RECUO (Sem alterações da última versão) ---
// ==============================================================================

const getSheetSequence = (length) => {
    const sequence = [];
    let currentLength = length;
    while (currentLength > 0.01) {
        if (currentLength >= 3 && (currentLength - 3 === 0 || currentLength - 3 >= 2)) {
            sequence.push(3); currentLength -= 3;
        } else if ((currentLength !== 1) && (currentLength !== 4) && (currentLength >= 3) && (currentLength - 3 <= 2)) {
            sequence.push(3); currentLength -= 3;
        } else if (currentLength === 4) {
            sequence.push(2); currentLength -= 2;
        } else if (currentLength >= 2 && currentLength < 3) {
            sequence.push(parseFloat(currentLength.toFixed(3))); currentLength = 0;
        } else {
            sequence.push(parseFloat(currentLength.toFixed(2))); currentLength = 0;
        }
    }
    return sequence;
};

const calcularEmbolsamento = (length) => {
    if (dom.checkRetreat.checked) {
        const sequence = getSheetSequence(length);
        const fittingQuantity = sequence.length > 0 ? sequence.length - 1 : 0;
        
        if (fittingQuantity > 0) {
            const sheetTotal = (fittingQuantity * (parseFloat(dom.embolsamento.value) || 0)) / 100;
            return length + sheetTotal;
        }
    }
    return length;
};

function optimizeSheetUsage(totalLength, somaDosPerfis, larguraChapaCm) {
    console.log("1. Função optimizeSheetUsage FOI CHAMADA com o valor:", totalLength);
    console.log("Soma dos Perfis (Largura Máxima Dinâmica):", somaDosPerfis);
    console.log("Largura da Chapa a ser usada (para corte virado):", larguraChapaCm);

    const sheets = [];
    const LARGURA_MAX_CORTE_NORMAL = 120; // Limite físico para corte padrão.

    const corteNormal = (length) => {
        console.log(`Processando ${length.toFixed(2)}m com corte NORMAL.`);
        const lengthWithRetreat = calcularEmbolsamento(length);
        
        // Corta o comprimento JÁ COM RECUO
        let currentLength = lengthWithRetreat;
         while (currentLength > 0.01) {
            if (currentLength >= 3 && (currentLength - 3 === 0 || currentLength - 3 >= 2)) {
                sheets.push(3); currentLength -= 3;
            } else if ((currentLength !== 1) && (currentLength !== 4) && (currentLength >= 3) && (currentLength - 3 <= 2)) {
                sheets.push(3); currentLength -= 3;
            } else if (currentLength === 4) {
                sheets.push(2); currentLength -= 2;
            } else if (currentLength >= 2 && currentLength < 3) {
                sheets.push(parseFloat(currentLength.toFixed(3))); currentLength = 0;
            } else {
                sheets.push(parseFloat(currentLength.toFixed(2))); currentLength = 0;
            }
        }
    };

    const corteVirado = (length) => {
        console.log(`Iniciando corte com CHAPA VIRADA para ${length.toFixed(2)}m.`);
        const larguraChapaVirada = larguraChapaCm / 100; // ex: 1.215m
        const tamanhoDoRecuo = parseFloat(dom.embolsamento.value) / 100 || 0;
        
        let currentLength = length;
        while (currentLength > 0.01) {
            if (currentLength >= larguraChapaVirada) {
                sheets.push(larguraChapaVirada);
                currentLength -= larguraChapaVirada;
                if (dom.checkRetreat.checked && currentLength > 0.01) {
                    currentLength += tamanhoDoRecuo;
                }
            } else {
                sheets.push(parseFloat(currentLength.toFixed(2)));
                currentLength = 0;
            }
        }
    };

    const { somasInicio, somasFim } = getInitialProfileWidths();

    if (somaDosPerfis <= LARGURA_MAX_CORTE_NORMAL) {
        console.log('Executando lógica de corte NORMAL para todo o comprimento.');
        corteNormal(totalLength);
    } 
    else {
        console.log('Executando lógica de corte HÍBRIDA/VIRADA.');
        const taxaAumentoPorMetro = totalLength > 0 ? (somasFim - somasInicio) / totalLength : 0;

        if (Math.abs(taxaAumentoPorMetro) < 0.001) {
             console.log('Largura constante, acima do limite. Toda a peça com corte virado.');
             corteVirado(totalLength);
        } else {
            const crossOverLength = (LARGURA_MAX_CORTE_NORMAL - somasInicio) / taxaAumentoPorMetro;

            if (crossOverLength <= 0 || crossOverLength >= totalLength) {
                console.log('Largura sempre acima do limite. Toda a peça com corte virado.');
                corteVirado(totalLength);
            }
            else {
                if (somasInicio < LARGURA_MAX_CORTE_NORMAL) {
                    console.log(`HÍBRIDO: Começa ESTREITO e fica LARGO. Ponto de virada em ${crossOverLength.toFixed(2)}m.`);
                    const normalPartLength = crossOverLength;
                    const turnedPartLength = totalLength - crossOverLength;
                    
                    corteNormal(normalPartLength);
                    corteVirado(turnedPartLength);
                }
                else {
                    console.log(`HÍBRIDO: Começa LARGO e fica ESTREITO. Ponto de virada em ${crossOverLength.toFixed(2)}m.`);
                    const turnedPartLength = crossOverLength;
                    const normalPartLength = totalLength - crossOverLength;

                    corteVirado(turnedPartLength);
                    corteNormal(normalPartLength);
                }
            }
        }
    }

    const finalLength = sheets.reduce((a, b) => a + b, 0);
    return { sheetSequence: sheets, finalLength: finalLength };
}


// ==============================================================================
// --- INÍCIO DA CORREÇÃO: LÓGICA DE EXIBIÇÃO ---
// ==============================================================================

/**
 * Exibe os resultados.
 * @param {number[]} sheetSequence - A sequência de chapas calculada (comprimentos com recuo).
 * @param {number} originalTotalLength - O comprimento TOTAL ORIGINAL do projeto (sem recuos).
 */
function displayResultsAsDrawings(sheetSequence, originalTotalLength) {
    dom.resultsOutput.innerHTML = '';
    let accumulatedLength = 0; // Este acumulador é apenas para exibição do título
    const profileTitle = document.createElement('h2');
    profileTitle.className = 'modal-title';
    profileTitle.textContent = 'Plano de Corte para o Perfil Desenhado';
    dom.resultsOutput.appendChild(profileTitle);

    // *** CORREÇÃO: Criar um Map para armazenar o 'fim' de CADA perfil ***
    // Isso é o que faltava. A sua variável 'fim' estava sendo compartilhada entre perfis.
    const profileFimMap = new Map();

    sheetSequence.forEach((sheetLength, i, tamanho) => {
        const container = document.createElement('div');
        container.className = 'piece-container';
        const title = document.createElement('h3');
        
        // A lógica de 'effectiveSheetLength' estava errada e foi removida.
        // Apenas exibimos o comprimento da chapa física.
        // O 'accumulatedLength' é apenas para o título e pode ser simples.
        const startPos = accumulatedLength;
        const endPos = accumulatedLength + sheetLength;
        title.textContent = `PEÇA ${i + 1} (Chapa de ${sheetLength.toFixed(3)}m) | Posição: ${startPos.toFixed(1)}m à ${endPos.toFixed(1)}m`;
        accumulatedLength = endPos; // Acumula o comprimento real da chapa
        
        const profileForThisPiece = JSON.parse(JSON.stringify(state.profiles));
        let somasInicioPeca = 0, somasFimPeca = 0;
        const medidasInicio = [], medidasFim = [];
        
        profileForThisPiece.forEach(p => {
            // Pegamos o ID único do perfil (usando o ponto inicial como ID)
            const profileId = `${p.segments[0].start.x},${p.segments[0].start.y}`;

            let inicio = 0;
            let fim = 0;

            const startSeg = p.segments[0], endSeg = p.segments[2];
            let isTapered = false;
            if (startSeg?.measurement && endSeg?.measurement && startSeg.measurement.text !== endSeg.measurement.text) {
                isTapered = true;
            }

            if(isTapered){
                const startWidth = parseFloat(startSeg.measurement.text);
                const endWidth = parseFloat(endSeg.measurement.text);
                const totalIncrease = endWidth - startWidth;
                
                // *** CORREÇÃO: SlopeRate DEVE usar o comprimento ORIGINAL ***
                const slopeRate = originalTotalLength > 0 ? totalIncrease / originalTotalLength : 0; // ex: 5 cm/m
                
                // Calcula o quanto a largura muda durante o recuo
                const recuoEmMetros = (parseFloat(dom.embolsamento.value) || 0) / 100;
                const ajusteRecuo = slopeRate * recuoEmMetros; // ex: 5 cm/m * 0.02m = 0.1 cm
                
                if (i == 0) {
                    // Na primeira peça, 'inicio' é a largura base
                    inicio = startWidth;
                    // 'fim' é calculado com base na inclinação e no comprimento DESTA CHAPA
                    fim = inicio + (slopeRate * sheetLength);
                } else {
                    // Nas peças seguintes, 'inicio' é o 'fim' anterior (deste perfil específico)
                    inicio = profileFimMap.get(profileId) || startWidth; // Pega o fim salvo
                    
                    if (dom.checkRetreat.checked) {
                        inicio -= ajusteRecuo;
                    }

                    if (i == tamanho.length - 1) { // Última peça
                        // FORÇA a largura final a ser a original do projeto
                        fim = endWidth;
                    } else { // Peças do meio
                        fim = inicio + (slopeRate * sheetLength);
                    }
                }
                
                // Salva o 'fim' desta peça para este perfil
                profileFimMap.set(profileId, fim);

                startSeg.measurement.text = inicio.toFixed(1);
                endSeg.measurement.text = fim.toFixed(1);

            } else if (startSeg?.measurement) {
                // Garante que perfis estáticos também sejam formatados
                startSeg.measurement.text = parseFloat(startSeg.measurement.text).toFixed(1);
                if (endSeg?.measurement) {
                    endSeg.measurement.text = parseFloat(endSeg.measurement.text).toFixed(1);
                }
            }
            
            p.segments.forEach(seg => {
                if (seg.measurement) {
                    const value = parseFloat(seg.measurement.text);
                    if (seg.measurement.type === 'variable_start') {
                        medidasInicio.push(value.toFixed(1)); somasInicioPeca += value;
                    } else if (seg.measurement.type === 'variable_end') {
                        medidasFim.push(value.toFixed(1)); somasFimPeca += value;
                    } else if (seg.measurement.type === 'static') {
                         medidasInicio.push(value.toFixed(1)); medidasFim.push(value.toFixed(1));
                         somasInicioPeca += value; somasFimPeca += value;
                    }
                }
            });
        });
        
        const totalWidthText = document.createElement('p');
        totalWidthText.style.fontWeight = 'bold';
        totalWidthText.innerHTML = `Largura Total (Desdobrada): <span style="color:#d93025">${somasInicioPeca.toFixed(1)}cm</span> (início) -> <span style="color:#d93025">${somasFimPeca.toFixed(1)}cm</span> (fim)`;
        container.appendChild(title);
        container.appendChild(totalWidthText);

        const canvas_piece = document.createElement('canvas');
        canvas_piece.className = 'piece-canvas';
        container.appendChild(canvas_piece);
        dom.resultsOutput.appendChild(container);
        
        drawCompleteProfileOnCanvas(canvas_piece, profileForThisPiece, { medidasInicio, medidasFim });
    });
    dom.resultsModal.classList.remove('hidden');
}

// ==============================================================================
// --- FIM DA CORREÇÃO ---
// ==============================================================================


export function handleCalculatePlan() {
    // 'totalLength' é o comprimento ORIGINAL do projeto.
    const totalLength = parseFloat(dom.totalLengthInput.value);
    if (isNaN(totalLength) || totalLength <= 0) {
        alert("ERRO: Por favor, insira um 'Comprimento Total' válido."); return;
    }
    if (state.profiles.length === 0) {
        alert("ERRO: Por favor, desenhe um perfil antes de calcular."); return;
    }

    const { somasInicio, somasFim } = getInitialProfileWidths();
    const somaDosPerfis = Math.max(somasInicio, somasFim);
    let larguraChapaCm = 120; // Largura padrão da chapa

    if (somaDosPerfis > 300) {
        alert(`ERRO: A largura do perfil (${somaDosPerfis.toFixed(1)}cm) excede a dimensão máxima da chapa (300cm).`);
        return;
    }

    if (somaDosPerfis > larguraChapaCm) {
        const resposta = prompt(`A largura do perfil (${somaDosPerfis.toFixed(1)}cm) excede o padrão de 120cm.\n\nIsso requer "virar" a chapa. Informe a largura EXATA da chapa a ser usada (em cm):`, "121.5");

        if (resposta === null) {
            console.log("Cálculo cancelado pelo usuário."); return;
        }

        const novaLargura = parseFloat(resposta);

        if (isNaN(novaLargura) || novaLargura <= 0) {
            alert("ERRO: Largura inválida. Por favor, insira um número válido."); return;
        }
        
        larguraChapaCm = novaLargura;
    }

    const result = optimizeSheetUsage(totalLength, somaDosPerfis, larguraChapaCm);
    
    // *** CORREÇÃO: Passa 'totalLength' (o original) para a função de exibição ***
    // Ela precisa do comprimento original para calcular a inclinação (slope) correta.
    displayResultsAsDrawings(result.sheetSequence, totalLength);
}

export function printPlan() {
    const resultsContainer = document.getElementById('results-output');
    const printNode = resultsContainer.cloneNode(true);
    const originalCanvases = resultsContainer.querySelectorAll('canvas.piece-canvas');
    const clonedCanvases = printNode.querySelectorAll('canvas.piece-canvas');
    clonedCanvases.forEach((canvas, index) => {
        const img = document.createElement('img');
        img.src = originalCanvases[index].toDataURL('image/png');
        img.className = 'piece-canvas';
        img.style.width = "100%";
        img.style.height = "auto";
        canvas.parentNode.replaceChild(img, canvas);
    });
    const printContent = printNode.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Seu navegador bloqueou a janela de impressão. Por favor, desabilite o bloqueador de pop-ups para este site.'); return; }
    printWindow.document.write(`<html><head><title>Plano de Corte e Caimento</title><link rel="stylesheet" href="style.css"><style>body { background-color: #fff !important; } .modal-content { height: auto; overflow: visible; box-shadow: none; padding: 10px; } .piece-container { page-break-inside: avoid; border: 1px solid #666; } .modal-title { page-break-after: avoid; } .close-btn, #print-plan-btn, #calculate-plan-btn { display: none; }</style></head><body><div class="modal-content">${printContent}</div></body></html>`);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 500);
}