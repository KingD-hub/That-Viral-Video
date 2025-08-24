// Ad Manager - Dynamically loads and manages all ad types
class AdManager {
    constructor() {
        this.config = null;
        this.init();
    }

    async init() {
        try {
            // Load site configuration
            const response = await fetch('/site-config.json');
            this.config = await response.json();
            
            // Initialize ads
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
        const socialBar = document.createElement('div');
        socialBar.id = 'social-bar-ad';
        socialBar.className = `social-bar-ad social-bar-${this.config.social_bar_position}`;
        socialBar.innerHTML = this.config.social_bar_ad_code;
        
        // Add drag functionality
        this.makeDraggable(socialBar);
        
        // Add close button
        this.addCloseButton(socialBar);
        
        document.body.appendChild(socialBar);
    }

    // Create Header Native Banner
    createHeaderNativeBanner() {
        if (this.config?.header_native_banner_code) {
            const headerBanner = document.createElement('div');
            headerBanner.className = 'native-banner header-native-banner';
            headerBanner.innerHTML = this.config.header_native_banner_code;
            
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(headerBanner);
            }
        }
    }

    // Create Sidebar Native Banner
    createSidebarNativeBanner() {
        if (this.config?.sidebar_native_banner_code) {
            const sidebarBanner = document.createElement('div');
            sidebarBanner.className = 'native-banner sidebar-native-banner';
            sidebarBanner.innerHTML = this.config.sidebar_native_banner_code;
            
            const main = document.querySelector('main');
            if (main) {
                main.appendChild(sidebarBanner);
            }
        }
    }

    // Create Content Native Banner
    createContentNativeBanner() {
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
    }

    // Make element draggable
    makeDraggable(element) {
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
    }

    // Add close button to social bar
    addCloseButton(element) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'social-bar-close';
        closeBtn.onclick = () => element.remove();
        element.appendChild(closeBtn);
    }

    // Inject ad script
    injectAdScript(scriptCode, id) {
        const script = document.createElement('div');
        script.id = id;
        script.innerHTML = scriptCode;
        document.body.appendChild(script);
    }

    // Default ads fallback
    initDefaultAds() {
        // Your existing hardcoded ads will work as fallback
        console.log('Using default ads');
    }
}

// Initialize ad manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdManager();
});
