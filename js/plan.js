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

function optimizeSheetUsage(totalLength, somaDosPerfis) {
    console.log("1. Função optimizeSheetUsage FOI CHAMADA com o valor:", totalLength);
    console.log("Soma dos Perfis (Largura Máxima Dinâmica):", somaDosPerfis);
    
    let sheetsFixed = 0;
    const sheets = [];
    let remainingLength = totalLength;

    // Lógica de cálculo de embolçamento (movida para ser reutilizável)
    const calcularEmbolsamento = (length) => {
        if (dom.checkRetreat.checked) {
            console.log("2. O checkbox de recuo está MARCADO.");
            let sheetMetal3 = 0;
            let sheetMetal2 = 0;
            let fittingQuantity = 0;

            if (length % 3 === 0) {
                sheetMetal3 = length / 3;
                fittingQuantity = sheetMetal3;
            } else {
                sheetMetal3 = Math.floor(length);
                while (sheetMetal3 > 0 && sheetMetal3 % 3 !== 0) {
                    sheetMetal3 -= 1;
                    sheetMetal2 += 1;
                }
                 if (sheetMetal3 === 0) { // Caso o comprimento seja menor que 3
                    sheetMetal2 = Math.ceil(length / 2) * 2; // Ajusta para a lógica de pares
                 }
                fittingQuantity = (sheetMetal3 / 3) + (sheetMetal2 / 2);
            }
            const sheetTotal = (fittingQuantity * dom.embolsamento.value) / 100;
            return length + sheetTotal;
        }
        return length;
    };

    // Função para o corte de chapas padrão (até 3m)
    const corteNormal = (length) => {
        let currentLength = length;
        while (currentLength > 0.01) {
            if (currentLength >= 3 && (currentLength - 3 === 0 || currentLength - 3 >= 2)) {
                sheets.push(3);
                currentLength -= 3;
            } else if ((currentLength !== 1) && (currentLength !== 4) && (currentLength >= 3) && (currentLength - 3 <= 2)) {
                sheets.push(3);
                currentLength -= 3;
            } else if (currentLength === 4) {
                sheets.push(2);
                currentLength -= 2;
            } else if (currentLength >= 2 && currentLength < 3) {
                sheets.push(parseFloat(currentLength.toFixed(3)));
                currentLength = 0;
            } else {
                sheets.push(parseFloat(currentLength.toFixed(2)));
                currentLength = 0;
            }
        }
    };

    // Verifica a largura do perfil para decidir a lógica de corte
    if (somaDosPerfis <= 120) {
        console.log('Executando lógica de corte NORMAL.');
        remainingLength = calcularEmbolsamento(totalLength);
        sheetsFixed = remainingLength;
        corteNormal(remainingLength);
    } else {
        console.log('Executando lógica de corte para LARGURA > 120cm.');
        const larguraChapa = 1.20; // Em metros
        const tamanhoDoRecuo = parseFloat(dom.embolsamento.value) / 100 || 0; // Em metros
        const caimentoPorMetro = 0.01; // 1cm por metro, ajuste se necessário
        let larguraAtual = somaDosPerfis / 100; // Converter para metros
        
        // Esta lógica assume que o caimento começa a partir da 'somaDosPerfis'.
        // Se a largura inicial já for maior que 120, todo o corte será com chapa "virada"
        let tamanhoFeito = 0;

        // Se a largura inicial for menor que 120, calcula até onde pode ir
        const { somasInicio, somasFim } = getInitialProfileWidths();
        if(somasInicio < 120){
             const aumentoTotal = (somasFim - somasInicio) / 100; // Aumento em metros
             const taxaAumentoPorMetro = aumentoTotal / totalLength;
             if (taxaAumentoPorMetro > 0) {
                tamanhoFeito = ((1.20 - (somasInicio/100)) / taxaAumentoPorMetro);
             }
        }

        if (tamanhoFeito > 0 && tamanhoFeito < totalLength) {
             console.log(`Corte normal para os primeiros ${tamanhoFeito.toFixed(2)}m`);
             let initialLength = calcularEmbolsamento(tamanhoFeito);
             corteNormal(initialLength);
             remainingLength = totalLength - tamanhoFeito;
        } else {
            remainingLength = totalLength;
        }

        console.log(`Restante para cortar em chapas de 1.20m: ${remainingLength.toFixed(2)}m`);
        while (remainingLength > 0.01) {
            if (remainingLength >= larguraChapa) {
                sheets.push(larguraChapa);
                remainingLength -= larguraChapa;
                if (dom.checkRetreat.checked && remainingLength > 0.01) {
                    remainingLength += tamanhoDoRecuo;
                }
            } else {
                sheets.push(parseFloat(remainingLength.toFixed(2)));
                remainingLength = 0;
            }
        }
        sheetsFixed = sheets.reduce((a, b) => a + b, 0);
    }

    return { sheetSequence: sheets, finalLength: sheetsFixed };
}


function displayResultsAsDrawings(sheetSequence, totalLength) {
    dom.resultsOutput.innerHTML = '';
    let accumulatedLength = 0;
    const profileTitle = document.createElement('h2');
    profileTitle.className = 'modal-title';
    profileTitle.textContent = 'Plano de Corte para o Perfil Desenhado';
    dom.resultsOutput.appendChild(profileTitle);

    sheetSequence.forEach((sheetLength, i) => {
        const container = document.createElement('div');
        container.className = 'piece-container';
        const title = document.createElement('h3');
        title.textContent = `PEÇA ${i + 1} (Chapa de ${sheetLength}m) | Posição: ${accumulatedLength.toFixed(1)}m à ${(accumulatedLength + sheetLength).toFixed(1)}m`;
        
        const profileForThisPiece = JSON.parse(JSON.stringify(state.profiles));
        let somasInicioPeca = 0;
        let somasFimPeca = 0;
        
        const medidasInicio = [];
        const medidasFim = [];

        profileForThisPiece.forEach(p => {
            const startSeg = p.segments[0];
            const endSeg = p.segments[2];
            let isTapered = false;
            
            if (startSeg?.measurement && endSeg?.measurement && startSeg.measurement.text !== endSeg.measurement.text) {
                isTapered = true;
            }

            if(isTapered){
                const startWidth = parseFloat(startSeg.measurement.text);
                const endWidth = parseFloat(endSeg.measurement.text);
                const totalIncrease = endWidth - startWidth;
                const slopeRate = totalLength > 0 ? totalIncrease / totalLength : 0;
                const startIncrease = accumulatedLength * slopeRate;
                const endIncrease = (accumulatedLength + sheetLength) * slopeRate;
                
                const embolsamentoAdjustment = (i > 0) ? (dom.embolsamento.value * (slopeRate / 100)) : 0;
                
                startSeg.measurement.text = (startWidth + startIncrease - embolsamentoAdjustment).toFixed(1);
                endSeg.measurement.text = (startWidth + endIncrease).toFixed(1);
            }
            
            p.segments.forEach(seg => {
                if (seg.measurement) {
                    const value = parseFloat(seg.measurement.text);
                    if (seg.measurement.type === 'variable_start') {
                        medidasInicio.push(value.toFixed(1));
                        somasInicioPeca += value;
                    } else if (seg.measurement.type === 'variable_end') {
                        medidasFim.push(value.toFixed(1));
                        somasFimPeca += value;
                    } else if (seg.measurement.type === 'static') {
                         medidasInicio.push(value.toFixed(1));
                         medidasFim.push(value.toFixed(1));
                         somasInicioPeca += value;
                         somasFimPeca += value;
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
        accumulatedLength += sheetLength;
    });
    dom.resultsModal.classList.remove('hidden');
}

export function handleCalculatePlan() {
    const totalLength = parseFloat(dom.totalLengthInput.value);
    if (isNaN(totalLength) || totalLength <= 0) {
        alert("ERRO: Por favor, insira um 'Comprimento Total' válido.");
        return;
    }

    if (state.profiles.length === 0) {
        alert("ERRO: Por favor, desenhe um perfil antes de calcular.");
        return;
    }

    // Calcula as larguras dinamicamente a partir do desenho
    const { somasInicio, somasFim } = getInitialProfileWidths();
    const somaDosPerfis = Math.max(somasInicio, somasFim);

    // Passa o valor dinâmico para a função de otimização
    const result = optimizeSheetUsage(totalLength, somaDosPerfis);
    
    displayResultsAsDrawings(result.sheetSequence, result.finalLength > 0 ? result.finalLength : totalLength);
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