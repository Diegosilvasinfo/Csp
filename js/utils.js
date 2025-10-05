// js/utils.js

import * as dom from './dom.js';
import * as state from './state.js';

export function getMousePos(evt) {
    const rect = dom.canvas.getBoundingClientRect();
    const scaleX = dom.canvas.width / rect.width;
    const scaleY = dom.canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

export function pointToLineSegmentDistance(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
}

export function checkAndAddMeasurement() {
    if (!state.hoveredSegment) return;
    
    let profileOwner = null;
    let segmentIndex = -1;
    for (const profile of state.profiles) {
        const index = profile.segments.indexOf(state.hoveredSegment);
        if (index > -1) {
            profileOwner = profile;
            segmentIndex = index;
            break;
        }
    }

    if (profileOwner) {
        const seg = state.hoveredSegment;
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

export function printCanvas() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dom.canvas.width;
    tempCanvas.height = dom.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Desenha o conteúdo do canvas original
    tempCtx.drawImage(dom.canvas, 0, 0);

    // Adiciona a marca d'água horizontal
    tempCtx.save();
    tempCtx.font = 'bold 50px Arial';
    tempCtx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    const centerX = tempCanvas.width / 2;
    const centerY = tempCanvas.height / 2;
    // Sem rotação para manter na horizontal
    tempCtx.fillText('Calhas São Pedro', centerX, centerY);
    tempCtx.restore();

    const dataUrl = tempCanvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if(!printWindow){ alert('Por favor, desative seu bloqueador de pop-ups.'); return; }
    printWindow.document.write('<html><head><title>Imprimir Desenho</title><style>@page { size: auto; margin: 0; } body { margin: 0; text-align: center; } img { max-width: 100%; max-height: 98vh; object-fit: contain; }</style></head><body>');
    printWindow.document.write(`<img src="${dataUrl}" onload="window.print(); window.close();" />`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
}

export function clearCanvas() {
    state.clearProfiles();
    state.setPreviewPath(null);
    state.setHoveredSegment(null);
    state.setHoveredTextSegment(null);
    state.setIsDraggingText(false);
    state.setDraggedSegment(null);
}

export function undoLastProfile() {
    if (state.profiles.length > 0) {
        state.popProfile();
    }
}


/**
 * Calcula o ponto de interseção entre dois segmentos de linha.
 * @param {object} seg1 - O primeiro segmento, com {start, end}.
 * @param {object} seg2 - O segundo segmento, com {start, end}.
 * @returns {object|null} - Retorna o ponto {x, y} da interseção ou null se não se cruzarem.
 */
export function getIntersection(seg1, seg2) {
    const p0 = seg1.start;
    const p1 = seg1.end;
    const p2 = seg2.start;
    const p3 = seg2.end;

    const s1_x = p1.x - p0.x;
    const s1_y = p1.y - p0.y;
    const s2_x = p3.x - p2.x;
    const s2_y = p3.y - p2.y;

    const denominator = (-s2_x * s1_y + s1_x * s2_y);
    if (denominator === 0) {
        return null; // Linhas paralelas ou colineares
    }

    const s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / denominator;
    const t = (s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / denominator;
    
    // ==============================================================================
    // =========================== ALTERAÇÃO PRINCIPAL AQUI ===========================
    // ==============================================================================
    // Antes, a condição era "s >= 0 && s <= 1". Agora, exigimos que a interseção
    // ocorra no "meio" de ambas as linhas, e não nas suas pontas.
    // Usamos um 'epsilon' (valor pequeno) para evitar problemas de precisão.
    const epsilon = 0.001;
    if (s > epsilon && s < 1 - epsilon && t > epsilon && t < 1 - epsilon) {
        return {
            x: p0.x + (t * s1_x),
            y: p0.y + (t * s1_y)
        };
    }

    return null; // Nenhuma interseção ou a interseção ocorre nos pontos finais
}

// js/utils.js

// ... (todas as suas outras funções continuam aqui em cima) ...

/**
 * Verifica se um ponto está dentro de um perfil (polígono fechado).
 * Usa o algoritmo Ray Casting.
 * @param {object} point - O ponto a ser testado {x, y}.
 * @param {object} profile - O perfil contendo os segmentos que formam o polígono.
 * @returns {boolean} - True se o ponto está dentro, false caso contrário.
 */
export function isPointInProfile(point, profile) {
    // Extrai os vértices do perfil para formar o polígono.
    const vertices = profile.segments.map(s => s.start);
    const x = point.x;
    const y = point.y;
    
    let isInside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
        if (intersect) {
            isInside = !isInside;
        }
    }
    
    return isInside;
}