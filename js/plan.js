// js/plan.js
import * as dom from './dom.js';
import * as state from './state.js';
import { drawCompleteProfileOnCanvas } from './canvas.js';

function optimizeSheetUsage(totalLength) {
    // variavel global para fixar a metragem com embolsamento
 var sheetsFixed = 0;
    const sheets = [];
    let remainingLength = totalLength;
     let sheetMetal3 = 0;
let sheetMetal2 = 0;
 let sheetTotal = 0;
let fittingQuantity = 0;

 //*********** Lógica do cálculo automático do embolçamento ****************//

        if(dom.checkRetreat.checked){

            if(remainingLength % 3 == 0){
                sheetMetal3 += remainingLength/3
                fittingQuantity += (sheetMetal3)-1
                sheetTotal = (fittingQuantity * dom.embolsamento.value)/100
                remainingLength += sheetTotal
                sheetsFixed = remainingLength
                
            }else{
                sheetMetal3 += remainingLength
                while(sheetMetal3 %3 != 0 || sheetMetal2 % 2 !=0){
                    sheetMetal3 -= 1
                    sheetMetal2 += 1
            }
            fittingQuantity += ((sheetMetal3/3) + (sheetMetal2/2))-1
            sheetTotal = (fittingQuantity * dom.embolsamento.value)/100
            remainingLength += sheetTotal
            sheetsFixed = remainingLength

          }
        }
        //******************* Fim do cálculo automático do embolçamento ****************//
        sheetsFixed = remainingLength

    while (remainingLength > 0.01) {
            if (remainingLength >= 3 && (remainingLength - 3 === 0 || remainingLength - 3 >= 2)) { sheets.push(3); remainingLength -= 3; } 
            else if ((remainingLength !== 1) && (remainingLength !== 4) && (remainingLength >= 3) && (remainingLength - 3 === 0 || remainingLength - 3 <= 2)) { sheets.push(3); remainingLength -= 3; } 
            else  if (remainingLength == 4 ){  sheets.push(2); remainingLength -= 2;}
            else if (remainingLength >= 2 && remainingLength < 3) { sheets.push(parseFloat(remainingLength.toFixed(3))); remainingLength -= remainingLength; }
            else { sheets.push(parseFloat(remainingLength.toFixed(2))); remainingLength = 0; }
        }
// No final de optimizeSheetUsage
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
        let somasInicio = 0;
        let somasFim = 0;
        
        profileForThisPiece.forEach(p => {
            const startSeg = p.segments[0];
            const endSeg = p.segments[2];
            let isTapered = false;
            
            if (startSeg?.measurement && endSeg?.measurement && startSeg.measurement.text !== endSeg.measurement.text) {
                isTapered = true;
            }

            if(isTapered){
                //totalLength = sheetsFixed
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
            
            p.segments.forEach((seg, idx) => {
                if (seg.measurement) {
                    const value = parseFloat(seg.measurement.text);
                    if(seg.measurement.type === 'variable_start' || seg.measurement.type === 'variable_end'){
                        if(idx === 0) somasInicio += value;
                        if(idx === 2) somasFim += value;
                    } else {
                       somasInicio += value;
                       somasFim += value;
                    }
                }
            });
        });
        
        const totalWidthText = document.createElement('p');
        totalWidthText.style.fontWeight = 'bold';
        totalWidthText.innerHTML = `Largura Total (Desdobrada): <span style="color:#d93025">${somasInicio.toFixed(1)}cm</span> (início) -> <span style="color:#d93025">${somasFim.toFixed(1)}cm</span> (fim)`;
        container.appendChild(title);
        container.appendChild(totalWidthText);

        const canvas_piece = document.createElement('canvas');
        canvas_piece.className = 'piece-canvas';
        container.appendChild(canvas_piece);
        dom.resultsOutput.appendChild(container);
        
        drawCompleteProfileOnCanvas(canvas_piece, profileForThisPiece);
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
    const result = optimizeSheetUsage(totalLength);
    displayResultsAsDrawings(result.sheetSequence, result.finalLength);
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
    printWindow.document.write(`<html><head><title>Plano de Corte e Caimento</title><link rel="stylesheet" href="style.css"><style>body { background-color: #fff !important; } .modal-content { height: auto; overflow: visible; box-shadow: none; padding: 10px; } .piece-container { page-break-inside: avoid; border: 1px solid #666; } .close-btn, #print-plan-btn, #calculate-plan-btn { display: none; }</style></head><body><div class="modal-content">${printContent}</div></body></html>`);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 500);
}