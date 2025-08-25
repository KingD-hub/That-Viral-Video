class VideoManager {
    constructor() {
        this.videosData = [];
        this.maxVideosPerPage = 5;
        this.init();
    }

    init() {
        this.loadCurrentVideos();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('videoForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
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
        // Load current videos from all pages
        await this.loadAllVideos();
        
        // Add new video to the beginning
        this.videosData.unshift(videoData);
        
        // Regenerate all pages
        await this.regeneratePages();
        
        // Create individual video page
        await this.createVideoPage(videoData);
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
                    videos.push({
                        title: title.textContent.trim(),
                        description: description ? description.textContent.trim() : '',
                        tags: card.getAttribute('data-tags') || '',
                        thumbnail: img ? img.src : '',
                        videoUrl: link.href.split('/').pop(),
                        timestamp: new Date().toISOString() // Fallback timestamp
                    });
                }
            });
            
            return videos;
        } catch (error) {
            console.error('Error extracting videos from', pagePath, error);
            return [];
        }
    }

    async regeneratePages() {
        const totalVideos = this.videosData.length;
        const totalPages = Math.ceil(totalVideos / this.maxVideosPerPage);
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const startIndex = (pageNum - 1) * this.maxVideosPerPage;
            const endIndex = startIndex + this.maxVideosPerPage;
            const pageVideos = this.videosData.slice(startIndex, endIndex);
            
            await this.generatePage(pageNum, pageVideos, totalPages);
        }
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

    async createVideoPage(videoData) {
        const videoFileName = this.generateVideoFileName(videoData.title, 1);
        
        // Load video template
        const templateResponse = await fetch('../videos/first-video.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Update title
        doc.title = `Watch — ${videoData.title}`;
        doc.querySelector('h1').textContent = videoData.title;
        
        // Update video embed
        const playerDiv = doc.querySelector('.responsive-embed');
        const existingIframe = playerDiv.querySelector('iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        // Add new embed
        const embedContainer = document.createElement('div');
        embedContainer.innerHTML = videoData.videoEmbed;
        const newIframe = embedContainer.querySelector('iframe');
        if (newIframe) {
            newIframe.id = 'videoPlayer';
            playerDiv.appendChild(newIframe);
        }
        
        const updatedHtml = doc.documentElement.outerHTML;
        this.downloadFile(videoFileName, updatedHtml);
    }

    generateVideoFileName(title, index) {
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        return `${slug}.html`;
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
