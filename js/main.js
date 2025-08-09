// js/main.js
import * as dom from './dom.js';
import * as state from './state.js';
import { redraw } from './canvas.js';
import { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseOut } from './handlers.js';
import { handleCalculatePlan, printPlan } from './plan.js';
import { clearCanvas, printCanvas, undoLastProfile } from './utils.js';

function initialize() {
    // Configura o tamanho inicial do canvas
    const container = document.getElementById('canvas-container');
    if (container) {
        dom.canvas.width = container.clientWidth;
        dom.canvas.height = container.clientHeight;
    } else {
        // Fallback se o container não existir
        dom.canvas.width = 800;
        dom.canvas.height = 600;
    }

    // Configura os event listeners
    dom.btbAtivo?.addEventListener('click', () => {
        state.setModoDesenhoAtivo(!state.modoDesenhoAtivo);
        state.setIsDrawing(false);
        state.setPreviewPath(null);
        state.setHoveredSegment(null);
        state.setHoveredTextSegment(null);
        dom.canvas.style.cursor = state.modoDesenhoAtivo ? 'crosshair' : 'default';
        dom.btbAtivo.classList.toggle('active', state.modoDesenhoAtivo);
    });

    dom.calculatePlanBtn?.addEventListener('click', handleCalculatePlan);
    dom.closeModalBtn?.addEventListener('click', () => dom.resultsModal.classList.add('hidden'));
    dom.printPlanBtn?.addEventListener('click', printPlan);
    dom.clearButton?.addEventListener('click', clearCanvas);
    dom.printButton?.addEventListener('click', () => printCanvas());
    dom.undoButton?.addEventListener('click', undoLastProfile);
    dom.lineWidthSlider?.addEventListener('input', (e) => {
        if(dom.lineWidthValue) dom.lineWidthValue.textContent = e.target.value;
    });

    // Listeners do canvas
    dom.canvas.addEventListener('mousedown', handleMouseDown);
    dom.canvas.addEventListener('mousemove', handleMouseMove);
    dom.canvas.addEventListener('mouseup', handleMouseUp);
    dom.canvas.addEventListener('mouseout', handleMouseOut);

    // Redimensionamento da janela
    window.addEventListener('resize', () => {
        if (container) {
            dom.canvas.width = container.clientWidth;
            dom.canvas.height = container.clientHeight;
        }
    });

    // Inicia a aplicação
    dom.canvas.style.cursor = 'crosshair';
    dom.btbAtivo?.classList.add('active');
    
    // Inicia o loop de desenho
    requestAnimationFrame(redraw);
}

// Garante que o DOM está carregado antes de rodar o script
document.addEventListener('DOMContentLoaded', initialize);