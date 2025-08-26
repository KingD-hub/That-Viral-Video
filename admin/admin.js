class VideoManager {
    constructor() {
        this.videosData = [];
        this.maxVideosPerPage = 5;
        this.videoStorage = new Map(); // Store video data with embed codes
        this.init();
    }

    init() {
        this.loadCurrentVideos();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('videoForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        const regenerateBtn = document.getElementById('regenerateBtn');
        regenerateBtn.addEventListener('click', () => this.handleRegenerate());
    }

    async handleRegenerate() {
        const regenerateBtn = document.getElementById('regenerateBtn');
        const loading = document.getElementById('loading');
        
        regenerateBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            await this.forceRegenerateAllVideos();
            this.showStatus('All videos regenerated with unique content! Download all files and upload them.', 'success');
        } catch (error) {
            this.showStatus('Error regenerating videos: ' + error.message, 'error');
        } finally {
            regenerateBtn.disabled = false;
            loading.style.display = 'none';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const loading = document.getElementById('loading');
        
        submitBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            const formData = new FormData(e.target);
            const videoData = {
                title: formData.get('title'),
                description: formData.get('description'),
                tags: formData.get('tags'),
                thumbnail: formData.get('thumbnail'),
                videoEmbed: formData.get('videoEmbed'),
                timestamp: new Date().toISOString()
            };

            await this.addNewVideo(videoData);
            this.showStatus('Video added successfully! Pages updated.', 'success');
            e.target.reset();
            this.loadCurrentVideos();
            
        } catch (error) {
            this.showStatus('Error adding video: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            loading.style.display = 'none';
        }
    }

    async addNewVideo(videoData) {
        // Store the new video with its embed code
        const videoId = this.generateVideoId(videoData.title);
        this.videoStorage.set(videoId, videoData);
        
        // Load current videos from all pages
        await this.loadAllVideos();
        
        // Add new video to the beginning with stored embed
        this.videosData.unshift({
            ...videoData,
            videoId: videoId,
            videoEmbed: videoData.videoEmbed // Ensure embed is preserved
        });
        
        // Regenerate all pages with complete data
        await this.regeneratePages();
    }

    generateVideoId(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30) + '-' + Date.now();
    }

    async loadAllVideos() {
        this.videosData = [];
        
        // Load from index.html
        const indexVideos = await this.extractVideosFromPage('../index.html');
        this.videosData.push(...indexVideos);
        
        // Load from other pages
        for (let i = 2; i <= 5; i++) {
            try {
                const pageVideos = await this.extractVideosFromPage(`../page${i}.html`);
                this.videosData.push(...pageVideos);
            } catch (error) {
                // Page doesn't exist, that's fine
                break;
            }
        }
    }

    async extractVideosFromPage(pagePath) {
        try {
            const response = await fetch(pagePath);
            if (!response.ok) return [];
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const videoCards = doc.querySelectorAll('.video-card');
            const videos = [];
            
            videoCards.forEach((card, index) => {
                const link = card.querySelector('a');
                const img = card.querySelector('img');
                const title = card.querySelector('h2');
                const description = card.querySelector('p');
                
                if (link && title) {
                    const videoUrl = link.href.split('/').pop();
                    const videoId = this.generateVideoId(title.textContent.trim());
                    
                    // Check if we have stored embed data for this video
                    const storedVideo = this.videoStorage.get(videoId);
                    
                    videos.push({
                        title: title.textContent.trim(),
                        description: description ? description.textContent.trim() : '',
                        tags: card.getAttribute('data-tags') || '',
                        thumbnail: img ? img.src : '',
                        videoUrl: videoUrl,
                        videoId: videoId,
                        videoEmbed: storedVideo ? storedVideo.videoEmbed : '', // Use stored embed or empty
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
            // For videos without stored embeds, try to extract from existing pages
            for (let video of videos) {
                if (!video.videoEmbed) {
                    video.videoEmbed = await this.extractEmbedFromVideoPage(video.videoUrl);
                }
            }
            
            return videos;
        } catch (error) {
            console.error('Error extracting videos from', pagePath, error);
            return [];
        }
    }

    async extractEmbedFromVideoPage(videoUrl) {
        try {
            const response = await fetch(`../videos/${videoUrl}`);
            if (!response.ok) {
                console.log(`Failed to fetch ${videoUrl}: ${response.status}`);
                return '';
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Find the responsive-embed container
            const embedContainer = doc.querySelector('.responsive-embed');
            if (!embedContainer) {
                console.log(`No .responsive-embed container found in ${videoUrl}`);
                return '';
            }
            
            // Look for iframe with id="videoPlayer" or any iframe
            let iframe = embedContainer.querySelector('#videoPlayer') || embedContainer.querySelector('iframe');
            
            if (iframe) {
                console.log(`Found iframe in ${videoUrl}:`, iframe.outerHTML.substring(0, 100));
                return iframe.outerHTML;
            }
            
            // If no iframe, get all content except fullscreen button
            const clonedContainer = embedContainer.cloneNode(true);
            const fullscreenBtn = clonedContainer.querySelector('.fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.remove();
            }
            
            const content = clonedContainer.innerHTML.trim();
            if (content && content !== '') {
                console.log(`Found embed content in ${videoUrl}:`, content.substring(0, 100));
                return content;
            }
            
            console.log(`No embed content found in ${videoUrl}`);
            return '';
        } catch (error) {
            console.error('Error extracting embed from video page:', videoUrl, error);
            return '';
        }
    }

    async regeneratePages() {
        // Download all files together
        await this.downloadAllFiles();
    }

    async generatePage(pageNum, videos, totalPages) {
        const isMainPage = pageNum === 1;
        const fileName = isMainPage ? '../index.html' : `../page${pageNum}.html`;
        
        // Load template
        const templateResponse = await fetch('../index.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Clear existing video grid
        const videoGrid = doc.querySelector('.video-grid');
        videoGrid.innerHTML = '';
        
        // Add videos
        videos.forEach((video, index) => {
            const videoCard = this.createVideoCardHTML(video, index + 1 + ((pageNum - 1) * this.maxVideosPerPage));
            videoGrid.appendChild(videoCard);
        });
        
        // Update pagination
        this.updatePagination(doc, pageNum, totalPages);
        
        // Generate download link for the page
        const updatedHtml = doc.documentElement.outerHTML;
        this.downloadFile(fileName.replace('../', ''), updatedHtml);
    }

    createVideoCardHTML(video, globalIndex) {
        const videoFileName = this.generateVideoFileName(video.title, globalIndex);
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'video-card';
        cardDiv.setAttribute('data-title', video.title);
        cardDiv.setAttribute('data-description', video.description);
        cardDiv.setAttribute('data-tags', video.tags);
        
        cardDiv.innerHTML = `
            <a href="videos/${videoFileName}">
                <div class="thumb-container">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </div>
                <div class="card-content">
                    <h2>${video.title}</h2>
                    <p>${video.description}</p>
                </div>
            </a>
        `;
        
        return cardDiv;
    }

    updatePagination(doc, currentPage, totalPages) {
        const pagination = doc.querySelector('.pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            const prevLink = document.createElement('a');
            prevLink.href = currentPage === 2 ? 'index.html' : `page${currentPage - 1}.html`;
            prevLink.textContent = '← Previous';
            pagination.appendChild(prevLink);
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                const current = document.createElement('span');
                current.className = 'current';
                current.textContent = i;
                pagination.appendChild(current);
            } else {
                const link = document.createElement('a');
                link.href = i === 1 ? 'index.html' : `page${i}.html`;
                link.textContent = i;
                pagination.appendChild(link);
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            const nextLink = document.createElement('a');
            nextLink.href = `page${currentPage + 1}.html`;
            nextLink.textContent = 'Next →';
            pagination.appendChild(nextLink);
        }
    }

    async createVideoPage(videoData, globalIndex) {
        const videoFileName = this.generateVideoFileName(videoData.title, globalIndex);
        
        // Load video template
        const templateResponse = await fetch('../videos/first-video.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Update title
        doc.title = `Watch — ${videoData.title}`;
        const h1 = doc.querySelector('h1');
        if (h1) h1.textContent = videoData.title;
        
        // Update video embed
        const playerDiv = doc.querySelector('.responsive-embed');
        if (playerDiv) {
            const existingIframe = playerDiv.querySelector('iframe');
            if (existingIframe) {
                existingIframe.remove();
            }
            
            // Keep the fullscreen button
            const fullscreenBtn = playerDiv.querySelector('.fullscreen-btn');
            
            // Add new embed
            const embedContainer = document.createElement('div');
            embedContainer.innerHTML = videoData.videoEmbed;
            const newIframe = embedContainer.querySelector('iframe');
            if (newIframe) {
                newIframe.id = 'videoPlayer';
                // Ensure iframe has proper styling
                newIframe.style.position = 'absolute';
                newIframe.style.top = '0';
                newIframe.style.left = '0';
                newIframe.style.width = '100%';
                newIframe.style.height = '100%';
                playerDiv.appendChild(newIframe);
            }
        }
        
        // Update related videos section with other videos
        this.updateRelatedVideos(doc, videoData, globalIndex);
        
        const updatedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        this.downloadFile(`videos/${videoFileName}`, updatedHtml);
    }

    updateRelatedVideos(doc, currentVideo, currentIndex) {
        const relatedGrid = doc.querySelector('.related .grid');
        if (!relatedGrid) return;
        
        relatedGrid.innerHTML = '';
        
        // Get other videos (excluding current one)
        const otherVideos = this.videosData.filter((_, index) => index !== currentIndex - 1);
        
        // Show up to 2 related videos
        const relatedVideos = otherVideos.slice(0, 2);
        
        relatedVideos.forEach((video, index) => {
            const relatedIndex = this.videosData.findIndex(v => v === video) + 1;
            const videoFileName = this.generateVideoFileName(video.title, relatedIndex);
            
            const cardDiv = document.createElement('a');
            cardDiv.className = 'card';
            cardDiv.href = videoFileName;
            
            cardDiv.innerHTML = `
                <div class="thumb">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
                </div>
                <div class="card-body">
                    <h3>${video.title}</h3>
                </div>
            `;
            
            relatedGrid.appendChild(cardDiv);
        });
    }

    generateVideoFileName(title, index) {
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        return `${slug}.html`;
    }

    // Force regeneration of ALL videos with their stored embed codes
    async forceRegenerateAllVideos() {
        console.log('Force regenerating all videos with unique embeds...');
        
        // Clear existing data
        this.videosData = [];
        
        // Load all videos from pages (this will extract embeds from existing pages)
        await this.loadAllVideos();
        
        // For videos without embeds, try to extract from their pages
        for (let video of this.videosData) {
            if (!video.videoEmbed || video.videoEmbed.trim() === '') {
                console.log(`Extracting embed for ${video.title}...`);
                video.videoEmbed = await this.extractEmbedFromVideoPage(video.videoUrl);
                
                // Store the extracted embed for future use
                if (video.videoEmbed) {
                    this.videoStorage.set(video.videoId, video);
                    console.log(`Stored embed for ${video.title}`);
                } else {
                    console.warn(`Could not extract embed for ${video.title}`);
                }
            }
        }
        
        // Download all files with unique content
        await this.downloadAllFiles();
    }

    downloadFile(filename, content, mimeType = 'text/html') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show download notification
        console.log(`Downloaded: ${filename}`);
    }

    async downloadAllFiles() {
        const JSZip = window.JSZip || await this.loadJSZip();
        const zip = new JSZip();
        
        // Create folders
        const rootFolder = zip.folder("root");
        const videosFolder = zip.folder("videos");
        
        // Calculate total pages needed (only pages with content)
        const totalPages = Math.ceil(this.videosData.length / this.maxVideosPerPage);
        
        // Generate main pages (only needed pages)
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const startIndex = (pageNum - 1) * this.maxVideosPerPage;
            const endIndex = startIndex + this.maxVideosPerPage;
            const pageVideos = this.videosData.slice(startIndex, endIndex);
            
            // Only generate page if it has videos
            if (pageVideos.length > 0) {
                const pageHtml = await this.generatePageHTML(pageNum, pageVideos, totalPages);
                const fileName = pageNum === 1 ? 'index.html' : `page${pageNum}.html`;
                rootFolder.file(fileName, pageHtml);
            }
        }
        
        // Generate all video pages
        for (let i = 0; i < this.videosData.length; i++) {
            const videoHtml = await this.generateVideoPageHTML(this.videosData[i], i + 1);
            const videoFileName = this.generateVideoFileName(this.videosData[i].title, i + 1);
            videosFolder.file(videoFileName, videoHtml);
        }
        
        // Generate and download ZIP
        const content = await zip.generateAsync({type: "blob"});
        this.downloadFile("site-files.zip", content, "application/zip");
    }

    async loadJSZip() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async generatePageHTML(pageNum, videos, totalPages) {
        const isMainPage = pageNum === 1;
        
        // Load template
        const templateResponse = await fetch('../index.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Clear existing video grid
        const videoGrid = doc.querySelector('.video-grid');
        videoGrid.innerHTML = '';
        
        // Add videos
        videos.forEach((video, index) => {
            const videoCard = this.createVideoCardHTML(video, index + 1 + ((pageNum - 1) * this.maxVideosPerPage));
            videoGrid.appendChild(videoCard);
        });
        
        // Update pagination
        this.updatePagination(doc, pageNum, totalPages);
        
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }

    async generateVideoPageHTML(videoData, globalIndex) {
        // Load video template
        const templateResponse = await fetch('../videos/first-video.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Update title
        doc.title = `Watch — ${videoData.title}`;
        const h1 = doc.querySelector('h1');
        if (h1) h1.textContent = videoData.title;
        
        // Update video embed - CRITICAL: Use the specific embed for this video
        const playerDiv = doc.querySelector('.responsive-embed');
        if (playerDiv) {
            // Clear all existing content except fullscreen button
            const fullscreenBtn = playerDiv.querySelector('.fullscreen-btn');
            playerDiv.innerHTML = '';
            if (fullscreenBtn) {
                playerDiv.appendChild(fullscreenBtn);
            }
            
            // Insert the specific embed code for this video
            if (videoData.videoEmbed && videoData.videoEmbed.trim()) {
                console.log(`Inserting embed for ${videoData.title}:`, videoData.videoEmbed.substring(0, 100));
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = videoData.videoEmbed.trim();
                const newIframe = tempDiv.querySelector('iframe');
                
                if (newIframe) {
                    // Set proper attributes for responsive embed
                    newIframe.id = 'videoPlayer';
                    newIframe.setAttribute('frameborder', '0');
                    newIframe.setAttribute('allowfullscreen', 'allowfullscreen');
                    newIframe.setAttribute('scrolling', 'no');
                    
                    // Apply responsive styling
                    newIframe.style.position = 'absolute';
                    newIframe.style.top = '0';
                    newIframe.style.left = '0';
                    newIframe.style.width = '100%';
                    newIframe.style.height = '100%';
                    newIframe.style.border = 'none';
                    
                    playerDiv.appendChild(newIframe);
                } else {
                    // If no iframe found, insert the embed code directly
                    const embedDiv = document.createElement('div');
                    embedDiv.innerHTML = videoData.videoEmbed;
                    embedDiv.style.position = 'absolute';
                    embedDiv.style.top = '0';
                    embedDiv.style.left = '0';
                    embedDiv.style.width = '100%';
                    embedDiv.style.height = '100%';
                    playerDiv.appendChild(embedDiv);
                }
            } else {
                console.warn(`No embed code found for ${videoData.title}`);
                // Add placeholder
                const placeholder = document.createElement('div');
                placeholder.innerHTML = '<p style="color: white; text-align: center; padding: 50px;">Video embed not available</p>';
                placeholder.style.position = 'absolute';
                placeholder.style.top = '0';
                placeholder.style.left = '0';
                placeholder.style.width = '100%';
                placeholder.style.height = '100%';
                playerDiv.appendChild(placeholder);
            }
        }
        
        // Update related videos section with other videos
        this.updateRelatedVideos(doc, videoData, globalIndex);
        
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }

    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }

    async loadCurrentVideos() {
        await this.loadAllVideos();
        this.displayVideoList();
    }

    displayVideoList() {
        const container = document.getElementById('videoItems');
        container.innerHTML = '';
        
        if (this.videosData.length === 0) {
            container.innerHTML = '<p style="color: #999;">No videos found</p>';
            return;
        }
        
        this.videosData.forEach((video, index) => {
            const item = document.createElement('div');
            item.className = 'video-item';
            item.innerHTML = `
                <h4>#${index + 1} - ${video.title}</h4>
                <p>${video.description}</p>
                <p style="font-size: 12px; color: #666;">Tags: ${video.tags}</p>
            `;
            container.appendChild(item);
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoManager();
});
