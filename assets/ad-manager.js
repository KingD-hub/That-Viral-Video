// Ad Manager - Dynamically loads and manages all ad types
class AdManager {
    constructor() {
        this.config = null;
        this.init();
    }

    async init() {
        try {
            // Load site configuration
            const response = await fetch('./site-config.json');
            if (!response.ok) {
                throw new Error('Config not found');
            }
            this.config = await response.json();
            
            // Initialize ads only if config loaded successfully
            this.initPopunderAd();
            this.initBannerAd();
            this.initSocialBarAd();
            this.initNativeBannerAds();
            
        } catch (error) {
            console.log('Ad configuration not loaded, using defaults');
            // Use default ads if config fails to load
            this.initDefaultAds();
        }
    }

    // Popunder Ad
    initPopunderAd() {
        if (this.config?.popunder_ad_code) {
            this.injectAdScript(this.config.popunder_ad_code, 'popunder-ad');
        }
    }

    // Banner Ad
    initBannerAd() {
        if (this.config?.banner_ad_code) {
            const bannerSlot = document.querySelector('.banner-slot');
            if (bannerSlot) {
                bannerSlot.innerHTML = this.config.banner_ad_code;
            }
        }
    }

    // Social Bar Ad
    initSocialBarAd() {
        if (this.config?.social_bar_ad_code && this.config?.social_bar_visible) {
            this.createSocialBarAd();
        }
    }

    // Native Banner Ads
    initNativeBannerAds() {
        if (this.config?.native_banners_visible) {
            this.createHeaderNativeBanner();
            this.createSidebarNativeBanner();
            this.createContentNativeBanner();
        }
    }

    // Create Social Bar Ad
    createSocialBarAd() {
        try {
            const socialBar = document.createElement('div');
            socialBar.id = 'social-bar-ad';
            socialBar.className = `social-bar-ad social-bar-${this.config.social_bar_position}`;
            socialBar.innerHTML = this.config.social_bar_ad_code;
            
            // Add drag functionality
            this.makeDraggable(socialBar);
            
            // Add close button
            this.addCloseButton(socialBar);
            
            document.body.appendChild(socialBar);
        } catch (error) {
            console.log('Social bar ad creation failed:', error);
        }
    }

    // Create Header Native Banner
    createHeaderNativeBanner() {
        try {
            if (this.config?.header_native_banner_code) {
                const headerBanner = document.createElement('div');
                headerBanner.className = 'native-banner header-native-banner';
                headerBanner.innerHTML = this.config.header_native_banner_code;
                
                const header = document.querySelector('header');
                if (header) {
                    header.appendChild(headerBanner);
                }
            }
        } catch (error) {
            console.log('Header native banner creation failed:', error);
        }
    }

    // Create Sidebar Native Banner
    createSidebarNativeBanner() {
        try {
            if (this.config?.sidebar_native_banner_code) {
                const sidebarBanner = document.createElement('div');
                sidebarBanner.className = 'native-banner sidebar-native-banner';
                sidebarBanner.innerHTML = this.config.sidebar_native_banner_code;
                
                const main = document.querySelector('main');
                if (main) {
                    main.appendChild(sidebarBanner);
                }
            }
        } catch (error) {
            console.log('Sidebar native banner creation failed:', error);
        }
    }

    // Create Content Native Banner
    createContentNativeBanner() {
        try {
            if (this.config?.content_native_banner_code) {
                const contentBanner = document.createElement('div');
                contentBanner.className = 'native-banner content-native-banner';
                contentBanner.innerHTML = this.config.content_native_banner_code;
                
                // Insert after first video
                const firstVideo = document.querySelector('.video-card');
                if (firstVideo) {
                    firstVideo.parentNode.insertBefore(contentBanner, firstVideo.nextSibling);
                }
            }
        } catch (error) {
            console.log('Content native banner creation failed:', error);
        }
    }

    // Make element draggable
    makeDraggable(element) {
        try {
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = 0;
            let yOffset = 0;

            element.addEventListener('mousedown', dragStart);
            element.addEventListener('mousemove', drag);
            element.addEventListener('mouseup', dragEnd);
            element.addEventListener('mouseleave', dragEnd);

            function dragStart(e) {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                if (e.target === element) {
                    isDragging = true;
                }
            }

            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    setTranslate(currentX, currentY, element);
                }
            }

            function setTranslate(xPos, yPos, el) {
                el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
            }

            function dragEnd() {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
            }
        } catch (error) {
            console.log('Draggable functionality failed:', error);
        }
    }

    // Add close button to social bar
    addCloseButton(element) {
        try {
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.className = 'social-bar-close';
            closeBtn.onclick = () => element.remove();
            element.appendChild(closeBtn);
        } catch (error) {
            console.log('Close button creation failed:', error);
        }
    }

    // Inject ad script
    injectAdScript(scriptCode, id) {
        try {
            const script = document.createElement('div');
            script.id = id;
            script.innerHTML = scriptCode;
            document.body.appendChild(script);
        } catch (error) {
            console.log('Ad script injection failed:', error);
        }
    }

    // Default ads fallback
    initDefaultAds() {
        // Your existing hardcoded ads will work as fallback
        console.log('Using default ads - site will work normally');
    }
}

// Initialize ad manager when DOM is loaded - with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        new AdManager();
    } catch (error) {
        console.log('Ad manager initialization failed:', error);
        // Site will continue to work normally even if ad manager fails
    }
});
