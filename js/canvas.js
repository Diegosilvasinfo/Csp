// js/canvas.js

import * as dom from './dom.js';
import * as state from './state.js';
import { getIntersection, isPointInProfile } from './utils.js';

/**
 * Função de desenho principal interativa.
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
        for (const segmentToDraw of profileToDraw.segments) {
            const intersectionData = [];
            for (let j = i + 1; j < state.profiles.length; j++) {
                const otherProfile = state.profiles[j];
                for (const otherSegment of otherProfile.segments) {
                    const point = getIntersection(segmentToDraw, otherSegment);
                    if (point) {
                        intersectionData.push({ point, occludingProfile: otherProfile });
                    }
                }
            }
            drawIntersectedSegment(dom.ctx, segmentToDraw, intersectionData);
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


function drawIntersectedSegment(ctx, segment, intersectionData) {
    const { start, end } = segment;

    ctx.lineWidth = segment.lineWidth;
    ctx.strokeStyle = (segment === state.hoveredSegment || segment === state.hoveredTextSegment) && !state.modoDesenhoAtivo ? '#007bff' : '#000000';
    ctx.setLineDash([]);

    if (intersectionData.length === 0) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        return;
    }

    let closestData = null;
    let minDistanceSq = Infinity;
    for (const data of intersectionData) {
        const distSq = (data.point.x - start.x)**2 + (data.point.y - start.y)**2;
        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestData = data;
        }
    }

    const closestIntersection = closestData.point;
    const occludingProfile = closestData.occludingProfile;

    const testPoint1 = { x: (start.x + closestIntersection.x) / 2, y: (start.y + closestIntersection.y) / 2 };
    const startHalfIsHidden = isPointInProfile(testPoint1, occludingProfile);

    if (startHalfIsHidden) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(closestIntersection.x, closestIntersection.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(closestIntersection.x, closestIntersection.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(closestIntersection.x, closestIntersection.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(closestIntersection.x, closestIntersection.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }
}

/**
 * ==============================================================================
 * ===================== FUNÇÃO DE DESENHO DE TEXTO ATUALIZADA ====================
 * ==============================================================================
 */
function drawMeasurementText(ctx, seg, scale = 1, offsetX = 0, offsetY = 0) {
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
        // --- MUDANÇA PRINCIPAL AQUI ---
        // Para linhas verticais, NÃO rotacionamos o texto.
        // Ele será desenhado "em pé" (horizontal) para máxima clareza.
        // A linha "ctx.rotate(...)" foi removida deste bloco.
    } else {
        // Para linhas horizontais ou inclinadas, mantém a rotação normal.
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

    function drawScaledSegment(ctx, segment, style) {
        const startX = segment.start.x * scale + offsetX;
        const startY = segment.start.y * scale + offsetY;
        const endX = segment.end.x * scale + offsetX;
        const endY = segment.end.y * scale + offsetY;
        
        ctx.beginPath();
        ctx.setLineDash(style === 'dashed' ? [4, 4] : []);
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    for (let i = 0; i < allProfiles.length; i++) {
        const profileToDraw = allProfiles[i];
        for (const segmentToDraw of profileToDraw.segments) {
            
            pieceCtx.lineWidth = segmentToDraw.lineWidth;
            pieceCtx.strokeStyle = '#333';

            const intersectionData = [];
            for (let j = i + 1; j < allProfiles.length; j++) {
                const otherProfile = allProfiles[j];
                for (const otherSegment of otherProfile.segments) {
                    const point = getIntersection(segmentToDraw, otherSegment);
                    if (point) {
                        intersectionData.push({ point, occludingProfile: otherProfile });
                    }
                }
            }

            if (intersectionData.length === 0) {
                drawScaledSegment(pieceCtx, segmentToDraw, 'solid');
                continue;
            }

            let closestData = null;
            let minDistanceSq = Infinity;
            for (const data of intersectionData) {
                const distSq = (data.point.x - segmentToDraw.start.x)**2 + (data.point.y - segmentToDraw.start.y)**2;
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestData = data;
                }
            }
            
            const closestIntersection = closestData.point;
            const occludingProfile = closestData.occludingProfile;
            const testPoint1 = { x: (segmentToDraw.start.x + closestIntersection.x) / 2, y: (segmentToDraw.start.y + closestIntersection.y) / 2 };
            const startHalfIsHidden = isPointInProfile(testPoint1, occludingProfile);

            if (startHalfIsHidden) {
                drawScaledSegment(pieceCtx, { start: segmentToDraw.start, end: closestIntersection }, 'dashed');
                drawScaledSegment(pieceCtx, { start: closestIntersection, end: segmentToDraw.end }, 'solid');
            } else {
                drawScaledSegment(pieceCtx, { start: segmentToDraw.start, end: closestIntersection }, 'solid');
                drawScaledSegment(pieceCtx, { start: closestIntersection, end: segmentToDraw.end }, 'dashed');
            }
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