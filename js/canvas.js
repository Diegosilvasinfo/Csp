// js/canvas.js

import * as dom from './dom.js';
import * as state from './state.js';
import { getIntersection, isPointInProfile } from './utils.js';

/**
 * Função de desenho principal que chama a nova lógica de renderização.
 */
export function redraw() {
    dom.ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    dom.ctx.lineCap = 'round';
    dom.ctx.lineJoin = 'round';

    if (state.mousePosition && state.modoDesenhoAtivo) {
        dom.ctx.save();
        dom.ctx.strokeStyle = '#a9a9a9';
        dom.ctx.lineWidth = 0.5;
        dom.ctx.setLineDash([4, 4]);
        dom.ctx.beginPath();
        dom.ctx.moveTo(0, state.mousePosition.y);
        dom.ctx.lineTo(dom.canvas.width, state.mousePosition.y);
        dom.ctx.stroke();
        dom.ctx.beginPath();
        dom.ctx.moveTo(state.mousePosition.x, 0);
        dom.ctx.lineTo(state.mousePosition.x, dom.canvas.height);
        dom.ctx.stroke();
        dom.ctx.restore();
    }

    for (let i = 0; i < state.profiles.length; i++) {
        const profileToDraw = state.profiles[i];
        const allLaterProfiles = state.profiles.slice(i + 1);

        for (const segmentToDraw of profileToDraw.segments) {
            drawSegmentWithMultipleIntersections(dom.ctx, segmentToDraw, allLaterProfiles);
        }
    }

    state.profiles.forEach(profile => {
        profile.segments.forEach(seg => {
            if (seg.measurement) {
                drawMeasurementText(dom.ctx, seg);
            }
        });
    });

    if (state.isDrawing && state.previewPath) {
        dom.ctx.lineWidth = state.previewPath.lineWidth;
        dom.ctx.strokeStyle = '#007bff';
        dom.ctx.setLineDash([5, 5]);
        dom.ctx.beginPath();
        const pv = state.previewPath.vertices;
        dom.ctx.moveTo(pv[0].x, pv[0].y); dom.ctx.lineTo(pv[1].x, pv[1].y);
        dom.ctx.lineTo(pv[2].x, pv[2].y); dom.ctx.lineTo(pv[3].x, pv[3].y);
        dom.ctx.closePath(); dom.ctx.stroke(); dom.ctx.setLineDash([]);
    }

    requestAnimationFrame(redraw);
}


/**
 * FUNÇÃO ATUALIZADA: Desenha um segmento, considerando interseções parciais E sobreposições completas.
 */
function drawSegmentWithMultipleIntersections(ctx, segment, occludingProfiles) {
    const intersectionPoints = [];
    occludingProfiles.forEach(profile => {
        profile.segments.forEach(otherSegment => {
            const point = getIntersection(segment, otherSegment);
            if (point) {
                intersectionPoints.push(point);
            }
        });
    });

    ctx.lineWidth = segment.lineWidth;
    ctx.strokeStyle = (segment === state.hoveredSegment || segment === state.hoveredTextSegment) && !state.modoDesenhoAtivo ? '#007bff' : '#000000';

    if (intersectionPoints.length === 0) {
        // --- LÓGICA ADICIONADA PARA SOBREPOSIÇÃO COMPLETA ---
        // Se não há interseções, verifica se o segmento está totalmente escondido.
        const midPoint = { x: (segment.start.x + segment.end.x) / 2, y: (segment.start.y + segment.end.y) / 2 };
        let isCompletelyHidden = false;
        for (const profile of occludingProfiles) {
            if (isPointInProfile(midPoint, profile)) {
                isCompletelyHidden = true;
                break;
            }
        }
        
        ctx.beginPath();
        ctx.setLineDash(isCompletelyHidden ? [4, 4] : []); // Traceja se estiver completamente escondido
        ctx.moveTo(segment.start.x, segment.start.y);
        ctx.lineTo(segment.end.x, segment.end.y);
        ctx.stroke();
        return;
    }

    // --- LÓGICA EXISTENTE PARA SOBREPOSIÇÃO PARCIAL (sem alterações) ---
    const allPoints = [segment.start, ...intersectionPoints, segment.end];

    allPoints.sort((a, b) => {
        const distA = Math.hypot(a.x - segment.start.x, a.y - segment.start.y);
        const distB = Math.hypot(b.x - segment.start.x, b.y - segment.start.y);
        return distA - distB;
    });
    
    for (let i = 0; i < allPoints.length - 1; i++) {
        const subStart = allPoints[i];
        const subEnd = allPoints[i+1];
        
        const midPoint = { x: (subStart.x + subEnd.x) / 2, y: (subStart.y + subEnd.y) / 2 };
        let isHidden = false;
        for (const profile of occludingProfiles) {
            if (isPointInProfile(midPoint, profile)) {
                isHidden = true;
                break;
            }
        }

        ctx.beginPath();
        ctx.setLineDash(isHidden ? [4, 4] : []);
        ctx.moveTo(subStart.x, subStart.y);
        ctx.lineTo(subEnd.x, subEnd.y);
        ctx.stroke();
    }
}

function drawMeasurementText(ctx, seg, scale = 1, offsetX = 0, offsetY = 0) {
    // (Esta função permanece a mesma)
    const startX = seg.start.x * scale + offsetX;
    const startY = seg.start.y * scale + offsetY;
    const endX = seg.end.x * scale + offsetX;
    const endY = seg.end.y * scale + offsetY;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const angle = Math.atan2(endY - startY, endX - startX);
    
    ctx.font = 'bold 14px Arial';
    const isVariable = seg.measurement.type === 'variable_start' || seg.measurement.type === 'variable_end';
    ctx.fillStyle = isVariable ? '#d93025' : '#1a73e8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let text = seg.measurement.text;
    
    ctx.save();
    ctx.translate(midX, midY);

    const absAngle = Math.abs(angle);
    const isVerticalish = absAngle > Math.PI / 4 && absAngle < (3 * Math.PI) / 4;

    if (isVerticalish) {
        // Não rotaciona texto em linhas verticais
    } else {
        ctx.rotate(angle);
        const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
        if (isUpsideDown) { 
            ctx.rotate(Math.PI);
        }
    }
    
    ctx.fillText(text, seg.measurement.offsetX, seg.measurement.offsetY);
    ctx.restore();
}

export function drawCompleteProfileOnCanvas(targetCanvas, allProfiles) {
    // (Esta função permanece a mesma)
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
    
    for (let i = 0; i < allProfiles.length; i++) {
        const profileToDraw = allProfiles[i];
        const allLaterProfiles = allProfiles.slice(i + 1);

        for (const segmentToDraw of profileToDraw.segments) {
            pieceCtx.lineWidth = segmentToDraw.lineWidth;
            pieceCtx.strokeStyle = '#333';
            
            const segmentForScaling = {
                start: { x: segmentToDraw.start.x * scale + offsetX, y: segmentToDraw.start.y * scale + offsetY },
                end: { x: segmentToDraw.end.x * scale + offsetX, y: segmentToDraw.end.y * scale + offsetY }
            };
            
            drawSegmentWithMultipleIntersections(pieceCtx, segmentForScaling, allLaterProfiles.map(p => ({
                segments: p.segments.map(s => ({
                    start: { x: s.start.x * scale + offsetX, y: s.start.y * scale + offsetY },
                    end: { x: s.end.x * scale + offsetX, y: s.end.y * scale + offsetY }
                }))
            })));
        }
    }
    
    allProfiles.forEach(p => {
        p.segments.forEach(seg => {
            if (seg.measurement) {
                drawMeasurementText(pieceCtx, seg, scale, offsetX, offsetY);
            }
        });
    });
}