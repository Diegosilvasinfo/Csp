window.onload = () => {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // --- Elementos do DOM ---
    const btbAtivo = document.getElementById('ativo'),
          lineWidthSlider = document.getElementById('lineWidth'),
          lineWidthValue = document.getElementById('lineWidthValue'),
          totalLengthInput = document.getElementById('total-length-input'),
          profileHeightInput = document.getElementById('profile-height-input'),
          calculatePlanBtn = document.getElementById('calculate-plan-btn'),
          resultsModal = document.getElementById('results-modal'),
          resultsOutput = document.getElementById('results-output'),
          closeModalBtn = document.getElementById('close-modal-btn'),
          printPlanBtn = document.getElementById('print-plan-btn'),
          clearButton = document.getElementById('clearButton'),
          printButton = document.getElementById('printButton'),
          undoButton = document.getElementById('undoButton'),
          embolsamento = document.getElementById('recuo-input'),
          btnSelected = document.getElementById('selected'),
          sheetsLength = 0 ;
          medidasDobras =  [],
          medidasDobrasFinal = []
          let  somasInicio = 0,
               somasFim =0,value1 = 0,value3=0,
               validador = false,
               remainingLength = 0.0;

    // --- Modelo de Dados ---
    let profiles = [],
    soma =0 ;

    // --- Variáveis de Estado ---
    let modoDesenhoAtivo = false;
    let isDrawing = false;
    let startPoint = null;
    let previewPath = null;
    let hoveredSegment = null;
    
    let isDraggingText = false;
    let draggedSegment = null;
    let hoveredTextSegment = null;

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        profiles.forEach(profile => {
            profile.segments.forEach(seg => {
                ctx.lineWidth = seg.lineWidth;
                ctx.strokeStyle = (seg === hoveredSegment || seg === hoveredTextSegment) && !modoDesenhoAtivo ? '#007bff' : '#000000';
                ctx.beginPath();
                ctx.moveTo(seg.start.x, seg.start.y);
                ctx.lineTo(seg.end.x, seg.end.y);
                ctx.stroke();

                if (seg.measurement) {
                    const midX = (seg.start.x + seg.end.x) / 2;
                    const midY = (seg.start.y + seg.end.y) / 2;
                    const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
                    
                    ctx.font = 'bold 14px Arial';
                    const isVariable = seg.measurement.type === 'variable_start' || seg.measurement.type === 'variable_end';
                    ctx.fillStyle = isVariable ? '#d93025' : '#1a73e8';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let text = seg.measurement.text;
                    
                    ctx.save();
                    ctx.translate(midX, midY);
                    ctx.rotate(angle);

                    const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
                    if (isUpsideDown) { 
                        ctx.rotate(Math.PI);
                    }
                    
                    ctx.fillText(text, seg.measurement.offsetX, seg.measurement.offsetY);
                    
                    ctx.restore();
                }
            });
        });

        if (isDrawing && previewPath) {
            ctx.lineWidth = previewPath.lineWidth;
            ctx.strokeStyle = '#007bff';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            const pv = previewPath.vertices;
            ctx.moveTo(pv[0].x, pv[0].y); ctx.lineTo(pv[1].x, pv[1].y);
            ctx.lineTo(pv[2].x, pv[2].y); ctx.lineTo(pv[3].x, pv[3].y);
            ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        }
        requestAnimationFrame(redraw);
    }

    function handleMouseDown(e) {
        if (modoDesenhoAtivo) {
            isDrawing = true;
            startPoint = getMousePos(e);
        } else {
            if (hoveredTextSegment) {
                isDraggingText = true;
                draggedSegment = hoveredTextSegment;
                canvas.style.cursor = 'grabbing';
                return;
            }
            if (hoveredSegment) {
                checkAndAddMeasurement(getMousePos(e));
            }
        }
    }

    function handleMouseMove(e) {
        const pos = getMousePos(e);

        if (isDraggingText) {
            const seg = draggedSegment;
            const midX = (seg.start.x + seg.end.x) / 2;
            const midY = (seg.start.y + seg.end.y) / 2;
            const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);

            const vx = pos.x - midX;
            const vy = pos.y - midY;
            
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            
            let newOffsetX = vx * cosAngle + vy * sinAngle;
            let newOffsetY = -vx * sinAngle + vy * cosAngle;

            const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
            if (isUpsideDown) {
                newOffsetX = -newOffsetX;
                newOffsetY = -newOffsetY;
            }
            
            seg.measurement.offsetX = newOffsetX;
            seg.measurement.offsetY = newOffsetY;
            return;
        }

        if (isDrawing && modoDesenhoAtivo) {
            const p1 = startPoint;
            const p2 = pos;
            const p3 = { x: pos.x + 200, y: pos.y - 200 };
            const p4 = { x: startPoint.x + 200, y: startPoint.y - 200 };
            previewPath = { vertices: [p1, p2, p3, p4], lineWidth: lineWidthSlider.value };
            return;
        }

        if (!modoDesenhoAtivo) {
            let foundText = null;
            for (const profile of profiles) {
                for (const seg of profile.segments) {
                    if (seg.measurement) {
                        const m = seg.measurement;
                        const midX = (seg.start.x + seg.end.x) / 2;
                        const midY = (seg.start.y + seg.end.y) / 2;
                        const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);

                        let localX = m.offsetX;
                        let localY = m.offsetY;

                        const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
                        if (isUpsideDown) {
                            localX = -localX;
                            localY = -localY;
                        }
                        
                        const cosAngle = Math.cos(angle);
                        const sinAngle = Math.sin(angle);
                        const rotatedX = localX * cosAngle - localY * sinAngle;
                        const rotatedY = localX * sinAngle + localY * cosAngle;

                        const textX = midX + rotatedX;
                        const textY = midY + rotatedY;

                        const distToText = Math.sqrt((pos.x - textX) ** 2 + (pos.y - textY) ** 2);
                        if (distToText < 20) {
                            foundText = seg;
                            break;
                        }
                    }
                }
                if (foundText) break;
            }

            hoveredTextSegment = foundText;

            if (hoveredTextSegment) {
                canvas.style.cursor = 'grab';
                hoveredSegment = null;
            } else {
                let closest = { dist: Infinity, seg: null };
                profiles.forEach(profile => {
                    profile.segments.forEach(seg => {
                        const dist = pointToLineSegmentDistance(pos, seg.start, seg.end);
                        if (dist < closest.dist) {
                            closest = { dist: dist, seg: seg };
                        }
                    });
                });

                if (closest.seg && closest.dist < closest.seg.lineWidth / 2 + 10) {
                    hoveredSegment = closest.seg;
                    canvas.style.cursor = 'pointer';
                } else {
                    hoveredSegment = null;
                    canvas.style.cursor = 'default';
                }
            }
        }
    }
    
    function handleMouseUp(e) {
        if (isDraggingText) {
            isDraggingText = false;
            draggedSegment = null;
        }
        
        if (isDrawing) {
            isDrawing = false;
            if (previewPath) {
                const v = previewPath.vertices;
                profiles.push({
                    segments: [
                        { start: v[0], end: v[1], lineWidth: previewPath.lineWidth, measurement: null }, 
                        { start: v[1], end: v[2], lineWidth: previewPath.lineWidth, measurement: null }, 
                        { start: v[2], end: v[3], lineWidth: previewPath.lineWidth, measurement: null }, 
                        { start: v[3], end: v[0], lineWidth: previewPath.lineWidth, measurement: null }
                    ]
                });
            }
            previewPath = null;
        }
    }
    
    function checkAndAddMeasurement(pos) {
        if (!hoveredSegment) return;
        
        let profileOwner = null;
        let segmentIndex = -1;
        for (const profile of profiles) {
            const index = profile.segments.indexOf(hoveredSegment);
            if (index > -1) {
                profileOwner = profile;
                segmentIndex = index;
                break;
            }
        }

        if (profileOwner) {
            const seg = hoveredSegment;
            const i = segmentIndex;
            let promptText = "Digite a medida (cm):", type = 'static';
            if (i === 0) { promptText = "Digite a LARGURA INICIAL da obra (cm):"; type = 'variable_start'; } 
            else if (i === 2) { promptText = "Digite a LARGURA FINAL da obra (cm):"; type = 'variable_end'; }
            
            const value = prompt(promptText, seg.measurement?.text || "");
            
            if (value !== null) {
                if (value.trim() !== '') {
                    seg.measurement = { 
                        text: value, 
                        type: type, 
                        offsetX: seg.measurement?.offsetX || 0,
                        offsetY: seg.measurement?.offsetY || -20
                    };
                } else {
                    seg.measurement = null;
                }
            }
        }
    }
    
    function handleCalculatePlan() {
        const totalLength = parseFloat(totalLengthInput.value);
        if (isNaN(totalLength) || totalLength <= 0) {
            alert("ERRO: Por favor, insira um 'Comprimento Total' válido.");
            return;
        }
        const sheetSequence = optimizeSheetUsage(totalLength);
        displayResultsAsDrawings(sheetSequence, totalLength);
    }
    



          /**
 * Otimiza o uso de chapas para um determinado comprimento total.
 * A lógica prioriza chapas de 3m, mas de forma inteligente para minimizar o desperdício.
 * Chapas disponíveis: 3m e 2m.
 *
 * @param {number} totalLength O comprimento total da obra em metros.
 * @returns {number[]} Um array com a sequência de comprimentos das peças.
 */
function optimizeSheetUsage(totalLength) {
    const sheets = [];
    let remainingLength = totalLength;

    // O loop continua enquanto houver comprimento para processar.
    // O 0.01 é uma tolerância para evitar problemas com ponto flutuante.
    while (remainingLength > 0.01) {
        
        // --- LÓGICA PRINCIPAL ---

        // Se o comprimento restante for de 3m ou menos, ele se torna a última peça.
        // Isso evita criar sobras pequenas (ex: para 2.5m, usamos uma peça de 2.5m ao invés de 2m + 0.5m).
        if (remainingLength <= 3) {
            sheets.push(parseFloat(remainingLength.toFixed(2)));
            remainingLength = 0; // Finaliza o cálculo
        }
        // Caso especial: 4 metros. A melhor combinação é 2m + 2m, não 3m + 1m.
        // Se pegássemos uma de 3m, sobraria 1m, o que é um desperdício.
        else if (remainingLength === 4) {
            sheets.push(2);
            remainingLength -= 2;
        }
        // Regra geral: Se o comprimento for maior que 3m (e não for o caso especial de 4m),
        // usamos a maior chapa disponível (3m) de forma segura.
        else {
            sheets.push(3);
            remainingLength -= 3;
        }
    }
    return sheets;
}





        // Antiga funçao de calculo de chapa

    /*function optimizeSheetUsage(totalLength) {
        const sheets = [];
        let remainingLength = totalLength;
        while (remainingLength > 0.01) {
            if (remainingLength >= 3 && (remainingLength - 3 === 0 || remainingLength - 3 >= 2)) { sheets.push(3); remainingLength -= 3; } 
            else if ((remainingLength !== 1) && (remainingLength !== 4) && (remainingLength >= 3) && (remainingLength - 3 === 0 || remainingLength - 3 <= 2)) { sheets.push(3); remainingLength -= 3; } 
            else if (remainingLength >= 2) { sheets.push(2); remainingLength -= 2; }
            else { sheets.push(parseFloat(remainingLength.toFixed(2))); remainingLength = 0; }
        }
        return sheets;
    }

*/



    
    // <<-- FUNÇÃO MODIFICADA -->>
    function displayResultsAsDrawings(sheetSequence, totalLength) {
        resultsOutput.innerHTML = '';
        let accumulatedLength = 0;
        const profileTitle = document.createElement('h2');
        profileTitle.className = 'modal-title';
        profileTitle.textContent = 'Plano de Corte para o Perfil Desenhado';
        resultsOutput.appendChild(profileTitle);

        // O 'i' aqui é o índice da peça. 0 = primeira, 1 = segunda, etc.
        sheetSequence.forEach((sheetLength, i) => {
            const container = document.createElement('div');
            container.className = 'piece-container';
            const title = document.createElement('h3');
            title.textContent = `PEÇA ${i + 1} (Chapa de ${sheetLength}m) | Posição: ${accumulatedLength.toFixed(1)}m à ${(accumulatedLength + sheetLength).toFixed(1)}m`;
            
            const profileForThisPiece = JSON.parse(JSON.stringify(profiles));
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
                    const startWidth = parseFloat(startSeg.measurement.text);
                    const endWidth = parseFloat(endSeg.measurement.text);
                    const totalIncrease = endWidth - startWidth;
                    const slopeRate = totalLength > 0 ? totalIncrease / totalLength : 0;
                    const startIncrease = accumulatedLength * slopeRate;
                    const endIncrease = (accumulatedLength + sheetLength) * slopeRate;
                    
                    // <<-- CORREÇÃO APLICADA AQUI -->>
                    // O ajuste do embolsamento só é aplicado se NÃO for a primeira peça (i > 0)
                    const embolsamentoAdjustment = (i > 0) ? (embolsamento.value * (slopeRate / 100)) : 0;
                    
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
            resultsOutput.appendChild(container);
            
            drawCompleteProfileOnCanvas(canvas_piece, profileForThisPiece);
            accumulatedLength += sheetLength;
        });
        resultsModal.classList.remove('hidden');
    }

    function drawCompleteProfileOnCanvas(targetCanvas, allProfiles) {
        const pieceCtx = targetCanvas.getContext('2d');
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allProfiles.forEach(p => { p.segments.forEach(seg => {
            minX = Math.min(minX, seg.start.x, seg.end.x);
            minY = Math.min(minY, seg.start.y, seg.end.y);
            maxX = Math.max(maxX, seg.start.x, seg.end.x);
            maxY = Math.max(maxY, seg.start.y, seg.end.y);
        }); });

        const drawingWidth = maxX - minX;
        const drawingHeight = maxY - minY;
        const padding = 50;
        targetCanvas.width = 750;
        targetCanvas.height = 400;

        const scale = Math.min((targetCanvas.width - padding * 2) / drawingWidth, (targetCanvas.height - padding * 2) / drawingHeight);
        const offsetX = (targetCanvas.width - drawingWidth * scale) / 2 - minX * scale;
        const offsetY = (targetCanvas.height - drawingHeight * scale) / 2 - minY * scale;

        pieceCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        allProfiles.forEach(p => {
            p.segments.forEach(seg => {
                const startX = seg.start.x * scale + offsetX;
                const startY = seg.start.y * scale + offsetY;
                const endX = seg.end.x * scale + offsetX;
                const endY = seg.end.y * scale + offsetY;

                pieceCtx.beginPath();
                pieceCtx.moveTo(startX, startY);
                pieceCtx.lineTo(endX, endY);
                pieceCtx.lineWidth = 3;
                pieceCtx.strokeStyle = '#333';
                pieceCtx.stroke();

                if (seg.measurement) {
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;
                    const angle = Math.atan2(endY - startY, endX - startX);

                    pieceCtx.font = 'bold 14px Arial';
                    pieceCtx.fillStyle = (seg.measurement.type === 'variable_start' || seg.measurement.type === 'variable_end') ? '#d93025' : '#1a73e8';
                    pieceCtx.textAlign = 'center';
                    pieceCtx.textBaseline = 'middle';

                    pieceCtx.save();
                    pieceCtx.translate(midX, midY);
                    pieceCtx.rotate(angle);
                    
                    const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
                    if (isUpsideDown) {
                        pieceCtx.rotate(Math.PI);
                    }

                    pieceCtx.fillText(`${seg.measurement.text}`, seg.measurement.offsetX, seg.measurement.offsetY);
                    pieceCtx.restore();
                }
            });
        });
    }
    
    // Funções utilitárias e listeners
    function getMousePos(evt) { const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height; return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY }; }
    function pointToLineSegmentDistance(p, v, w) { const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2; if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2); let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2; t = Math.max(0, Math.min(1, t)); const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }; return Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2); }
    function printCanvas(canvas) { const dataUrl = canvas.toDataURL('image/png'); const printWindow = window.open('', '_blank'); if(!printWindow){alert('Por favor, desative seu bloqueador de pop-ups.'); return;} printWindow.document.write('<html><head><title>Imprimir Desenho</title><style>@page { size: auto; margin: 0; } body { margin: 0; text-align: center; } img { max-width: 100%; max-height: 98vh; object-fit: contain; }</style></head><body>'); printWindow.document.write(`<img src="${dataUrl}" onload="window.print(); window.close();" />`); printWindow.document.write('</body></html>'); printWindow.document.close(); }
    function clearCanvas() { profiles = []; previewPath = null; hoveredSegment = null; hoveredTextSegment = null; isDraggingText = false; draggedSegment = null; }
    
    function undoLastProfile() {
        if (profiles.length > 0) {
            profiles.pop();
        }
    }
    
    btbAtivo.addEventListener('click', () => { modoDesenhoAtivo = !modoDesenhoAtivo; isDrawing = false; previewPath = null; hoveredSegment = null; hoveredTextSegment = null; canvas.style.cursor = modoDesenhoAtivo ? 'crosshair' : 'default'; btbAtivo.classList.toggle('active', modoDesenhoAtivo); });
    calculatePlanBtn.addEventListener('click', handleCalculatePlan);
    closeModalBtn.addEventListener('click', () => resultsModal.classList.add('hidden'));
    printPlanBtn.addEventListener('click', () => { const resultsContainer = document.getElementById('results-output'); const printNode = resultsContainer.cloneNode(true); const originalCanvases = resultsContainer.querySelectorAll('canvas.piece-canvas'); const clonedCanvases = printNode.querySelectorAll('canvas.piece-canvas'); clonedCanvases.forEach((canvas, index) => { const img = document.createElement('img'); img.src = originalCanvases[index].toDataURL('image/png'); img.className = 'piece-canvas'; img.style.width = "100%"; img.style.height = "auto"; canvas.parentNode.replaceChild(img, canvas); }); const printContent = printNode.innerHTML; const printWindow = window.open('', '_blank'); if (!printWindow) { alert('Seu navegador bloqueou a janela de impressão. Por favor, desabilite o bloqueador de pop-ups para este site.'); return; } printWindow.document.write(`<html><head><title>Plano de Corte e Caimento</title><link rel="stylesheet" href="style.css"><style>body { background-color: #fff !important; } .modal-content { height: auto; overflow: visible; box-shadow: none; padding: 10px; } .piece-container { page-break-inside: avoid; border: 1px solid #666; } .close-btn, #print-plan-btn, #calculate-plan-btn { display: none; }</style></head><body><div class="modal-content">${printContent}</div></body></html>`); printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500); });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', () => { if (isDraggingText) { isDraggingText = false; draggedSegment = null; } hoveredSegment = null; hoveredTextSegment = null; canvas.style.cursor = 'default'; });
    
    clearButton.addEventListener('click', clearCanvas);
    printButton.addEventListener('click', () => printCanvas(canvas));
    undoButton.addEventListener('click', undoLastProfile);
    
    lineWidthSlider.addEventListener('input', (e) => lineWidthValue.textContent = e.target.value);
    window.addEventListener('resize', () => { const container = document.getElementById('canvas-container'); canvas.width = container.clientWidth; canvas.height = container.clientHeight; });
    
    const container = document.getElementById('canvas-container'); 
    canvas.width = container.clientWidth; 
    canvas.height = container.clientHeight;
    canvas.style.cursor = 'crosshair';
    btbAtivo.classList.add('active');
    modoDesenhoAtivo = true;
    requestAnimationFrame(redraw);
};