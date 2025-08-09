// js/canvas.js

import * as dom from './dom.js';
import * as state from './state.js';

export function redraw() {
    dom.ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    dom.ctx.lineCap = 'round';
    dom.ctx.lineJoin = 'round';

    state.profiles.forEach(profile => {
        profile.segments.forEach(seg => {
            dom.ctx.lineWidth = seg.lineWidth;
            dom.ctx.strokeStyle = (seg === state.hoveredSegment || seg === state.hoveredTextSegment) && !state.modoDesenhoAtivo ? '#007bff' : '#000000';
            dom.ctx.beginPath();
            dom.ctx.moveTo(seg.start.x, seg.start.y);
            dom.ctx.lineTo(seg.end.x, seg.end.y);
            dom.ctx.stroke();

            if (seg.measurement) {
                const midX = (seg.start.x + seg.end.x) / 2;
                const midY = (seg.start.y + seg.end.y) / 2;
                const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);
                
                dom.ctx.font = 'bold 14px Arial';
                const isVariable = seg.measurement.type === 'variable_start' || seg.measurement.type === 'variable_end';
                dom.ctx.fillStyle = isVariable ? '#d93025' : '#1a73e8';
                dom.ctx.textAlign = 'center';
                dom.ctx.textBaseline = 'middle';
                let text = seg.measurement.text;
                
                dom.ctx.save();
                dom.ctx.translate(midX, midY);
                dom.ctx.rotate(angle);

                const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
                if (isUpsideDown) { 
                    dom.ctx.rotate(Math.PI);
                }
                
                dom.ctx.fillText(text, seg.measurement.offsetX, seg.measurement.offsetY);
                dom.ctx.restore();
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