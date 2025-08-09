// js/handlers.js

import * as dom from './dom.js';
import * as state from './state.js';
import { getMousePos, checkAndAddMeasurement, pointToLineSegmentDistance } from './utils.js';

export function handleMouseDown(e) {
    if (state.modoDesenhoAtivo) {
        state.setIsDrawing(true);
        state.setStartPoint(getMousePos(e));
    } else {
        if (state.hoveredTextSegment) {
            state.setIsDraggingText(true);
            state.setDraggedSegment(state.hoveredTextSegment);
            dom.canvas.style.cursor = 'grabbing';
            return;
        }
        if (state.hoveredSegment) {
            checkAndAddMeasurement();
        }
    }
}

export function handleMouseMove(e) {
    const pos = getMousePos(e);
    state.setMousePosition(pos);

    // ==============================================================================
    // ======================= ATUALIZAÇÃO 1: LÓGICA DE ARRASTAR =====================
    // ==============================================================================
    if (state.isDraggingText) {
        const seg = state.draggedSegment;
        const midX = (seg.start.x + seg.end.x) / 2;
        const midY = (seg.start.y + seg.end.y) / 2;
        const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);

        const absAngle = Math.abs(angle);
        const isVerticalish = absAngle > Math.PI / 4 && absAngle < (3 * Math.PI) / 4;
        
        let newOffsetX, newOffsetY;

        if (isVerticalish) {
            // Para linhas verticais, o texto NÃO é rotacionado.
            // O offset é a distância direta do mouse ao centro da linha.
            newOffsetX = pos.x - midX;
            newOffsetY = pos.y - midY;
        } else {
            // Para linhas horizontais/inclinadas, o texto É rotacionado.
            // Usamos a lógica antiga para converter as coordenadas.
            const vx = pos.x - midX;
            const vy = pos.y - midY;
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            
            newOffsetX = vx * cosAngle + vy * sinAngle;
            newOffsetY = -vx * sinAngle + vy * cosAngle;

            const isUpsideDown = angle > Math.PI / 2 || angle < -Math.PI / 2;
            if (isUpsideDown) {
                newOffsetX = -newOffsetX;
                newOffsetY = -newOffsetY;
            }
        }
        
        seg.measurement.offsetX = newOffsetX;
        seg.measurement.offsetY = newOffsetY;
        return;
    }

    if (state.isDrawing && state.modoDesenhoAtivo) {
        const p1 = state.startPoint;
        const p2 = pos;
        const p3 = { x: pos.x + 200, y: pos.y - 200 };
        const p4 = { x: state.startPoint.x + 200, y: state.startPoint.y - 200 };
        state.setPreviewPath({ vertices: [p1, p2, p3, p4], lineWidth: dom.lineWidthSlider.value });
        return;
    }

    // ==============================================================================
    // ================= ATUALIZAÇÃO 2: LÓGICA DE DETECÇÃO DE HOVER =================
    // ==============================================================================
    if (!state.modoDesenhoAtivo) {
        let foundText = null;
        for (const profile of state.profiles) {
            for (const seg of profile.segments) {
                if (seg.measurement) {
                    const m = seg.measurement;
                    const midX = (seg.start.x + seg.end.x) / 2;
                    const midY = (seg.start.y + seg.end.y) / 2;
                    const angle = Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x);

                    const absAngle = Math.abs(angle);
                    const isVerticalish = absAngle > Math.PI / 4 && absAngle < (3 * Math.PI) / 4;

                    let textX, textY;

                    if (isVerticalish) {
                        // Se a linha é vertical, o texto não é rotacionado. A posição é simples.
                        textX = midX + m.offsetX;
                        textY = midY + m.offsetY;
                    } else {
                        // Se a linha é inclinada, calcula a posição rotacionada.
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
                        textX = midX + rotatedX;
                        textY = midY + rotatedY;
                    }
                    
                    const distToText = Math.sqrt((pos.x - textX) ** 2 + (pos.y - textY) ** 2);
                    if (distToText < 20) {
                        foundText = seg;
                        break;
                    }
                }
            }
            if (foundText) break;
        }

        state.setHoveredTextSegment(foundText);

        if (state.hoveredTextSegment) {
            dom.canvas.style.cursor = 'grab';
            state.setHoveredSegment(null);
        } else {
            let closest = { dist: Infinity, seg: null };
            state.profiles.forEach(profile => {
                profile.segments.forEach(seg => {
                    const dist = pointToLineSegmentDistance(pos, seg.start, seg.end);
                    if (dist < closest.dist) {
                        closest = { dist: dist, seg: seg };
                    }
                });
            });

            if (closest.seg && closest.dist < closest.seg.lineWidth / 2 + 10) {
                state.setHoveredSegment(closest.seg);
                dom.canvas.style.cursor = 'pointer';
            } else {
                state.setHoveredSegment(null);
                dom.canvas.style.cursor = 'default';
            }
        }
    }
}

export function handleMouseUp() {
    if (state.isDraggingText) {
        state.setIsDraggingText(false);
        state.setDraggedSegment(null);
    }
    
    if (state.isDrawing) {
        state.setIsDrawing(false);
        if (state.previewPath) {
            const v = state.previewPath.vertices;
            state.addProfile({
                segments: [
                    { start: v[0], end: v[1], lineWidth: state.previewPath.lineWidth, measurement: null }, 
                    { start: v[1], end: v[2], lineWidth: state.previewPath.lineWidth, measurement: null }, 
                    { start: v[2], end: v[3], lineWidth: state.previewPath.lineWidth, measurement: null }, 
                    { start: v[3], end: v[0], lineWidth: state.previewPath.lineWidth, measurement: null }
                ]
            });
        }
        state.setPreviewPath(null);
    }
}

export function handleMouseOut() {
    state.setMousePosition(null);

    if (state.isDraggingText) {
        state.setIsDraggingText(false);
        state.setDraggedSegment(null);
    }
    state.setHoveredSegment(null);
    state.setHoveredTextSegment(null);
    dom.canvas.style.cursor = 'default';
}