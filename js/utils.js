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
    const dataUrl = dom.canvas.toDataURL('image/png');
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