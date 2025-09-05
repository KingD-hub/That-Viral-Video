/**
 * Automatic Theater Mode Implementation
 * This script automatically adds theater mode functionality to any video page
 * Just include this script and it will work on any page with video content
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheaterMode);
    } else {
        initTheaterMode();
    }
    
    function initTheaterMode() {
        // Find video containers automatically
        const playerWrap = document.querySelector('.player-wrap') || document.querySelector('[id*="player"]') || document.querySelector('.responsive-embed').parentElement;
        const videoContainer = document.querySelector('.responsive-embed') || document.querySelector('iframe') || document.querySelector('video');
        
        if (!playerWrap || !videoContainer) {
            console.log('Theater Mode: No video container found');
            return;
        }
        
        // Add required IDs if they don't exist
        if (!playerWrap.id) playerWrap.id = 'playerWrap';
        if (!videoContainer.parentElement.classList.contains('video-container')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-container';
            wrapper.id = 'videoContainer';
            videoContainer.parentElement.insertBefore(wrapper, videoContainer);
            wrapper.appendChild(videoContainer);
        }
        
        // Create and inject theater mode button
        createTheaterButton();
        
        // Initialize theater mode functionality
        initTheaterFunctionality();
        
        console.log('Theater Mode: Initialized successfully');
    }
    
    function createTheaterButton() {
        const videoContainer = document.getElementById('videoContainer') || document.querySelector('.video-container');
        
        // Check if button already exists
        if (document.querySelector('.theater-btn')) {
            return;
        }
        
        const button = document.createElement('button');
        button.className = 'theater-btn';
        button.title = 'Theater Mode';
        button.onclick = window.toggleTheaterMode;
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
        `;
        
        videoContainer.appendChild(button);
    }
    
    function initTheaterFunctionality() {
        // Theater mode state
        let isTheaterMode = false;
        
        // Make toggleTheaterMode globally available
        window.toggleTheaterMode = function() {
            const playerWrap = document.getElementById('playerWrap');
            const container = document.getElementById('videoContainer');
            const btn = document.querySelector('.theater-btn');
            const body = document.body;
            
            if (!playerWrap || !container || !btn) {
                console.error('Theater Mode: Required elements not found');
                return;
            }
            
            isTheaterMode = !isTheaterMode;
            
            if (isTheaterMode) {
                playerWrap.classList.add('theater-mode');
                body.classList.add('theater-active');
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"></path>
                    </svg>
                `;
                btn.title = 'Exit Theater Mode';
                
                // Show hint for users
                showTheaterHint();
            } else {
                playerWrap.classList.remove('theater-mode');
                body.classList.remove('theater-active');
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                `;
                btn.title = 'Theater Mode';
            }
        };
        
        // Keyboard shortcut
        document.addEventListener('keydown', function(e) {
            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                window.toggleTheaterMode();
            }
        });
    }
    
    function showTheaterHint() {
        // Remove existing hint if any
        const existingHint = document.querySelector('.theater-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        const hint = document.createElement('div');
        hint.className = 'theater-hint';
        hint.textContent = 'Press "T" or click the button to exit theater mode';
        document.body.appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 3000);
    }
})();
