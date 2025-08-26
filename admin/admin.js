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
        const addFormBtn = document.getElementById('addFormBtn');
        addFormBtn.addEventListener('click', () => this.addVideoForm());
        
        const submitAllBtn = document.getElementById('submitAllBtn');
        submitAllBtn.addEventListener('click', () => this.handleSubmitAll());
        
        const regenerateBtn = document.getElementById('regenerateBtn');
        regenerateBtn.addEventListener('click', () => this.handleRegenerate());
        
        // Add initial form
        this.addVideoForm();
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

    addVideoForm() {
        const formsContainer = document.getElementById('formsContainer');
        const formCount = formsContainer.children.length + 1;
        
        const formDiv = document.createElement('div');
        formDiv.className = 'video-form';
        formDiv.style.cssText = 'border: 2px solid #444; padding: 20px; margin: 15px 0; border-radius: 8px; background: #2a2a2a; position: relative;';
        
        formDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: #ff6b6b; margin: 0;">Video ${formCount}</h3>
                ${formCount > 1 ? `<button type="button" class="remove-form-btn" onclick="this.parentElement.parentElement.remove(); videoManager.updateFormNumbers();" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">❌ Remove</button>` : ''}
            </div>
            
            <div class="form-group">
                <label>Video Title</label>
                <input type="text" name="title" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                <div class="hint">Enter the video title as it will appear on the site</div>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea name="description" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px; min-height: 80px;"></textarea>
                <div class="hint">Brief description of the video content</div>
            </div>

            <div class="form-group">
                <label>Tags</label>
                <input type="text" name="tags" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                <div class="hint">Comma-separated tags (e.g., "teen,hardcore,blonde")</div>
            </div>

            <div class="form-group">
                <label>Thumbnail URL</label>
                <input type="url" name="thumbnail" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                <div class="hint">Direct link to the thumbnail image</div>
            </div>

            <div class="form-group">
                <label>Video Embed Code</label>
                <textarea name="videoEmbed" required style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px; min-height: 100px;"></textarea>
                <div class="hint">Complete iframe embed code (e.g., &lt;iframe src="..." ...&gt;&lt;/iframe&gt;)</div>
            </div>
        `;
        
        formsContainer.appendChild(formDiv);
    }

    updateFormNumbers() {
        const forms = document.querySelectorAll('.video-form');
        forms.forEach((form, index) => {
            const header = form.querySelector('h3');
            header.textContent = `Video ${index + 1}`;
        });
    }

    async handleSubmitAll() {
        const submitAllBtn = document.getElementById('submitAllBtn');
        const loading = document.getElementById('loading');
        const forms = document.querySelectorAll('.video-form');
        
        if (forms.length === 0) {
            this.showStatus('No video forms found. Add at least one video.', 'error');
            return;
        }
        
        submitAllBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            const videosData = [];
            
            // Collect data from all forms
            for (let i = 0; i < forms.length; i++) {
                const form = forms[i];
                const inputs = form.querySelectorAll('input, textarea');
                const videoData = {};
                
                inputs.forEach(input => {
                    if (input.name) {
                        videoData[input.name] = input.value.trim();
                    }
                });
                
                // Validate required fields
                if (!videoData.title || !videoData.description || !videoData.tags || !videoData.thumbnail || !videoData.videoEmbed) {
                    throw new Error(`Video ${i + 1} is missing required fields`);
                }
                
                videoData.timestamp = new Date().toISOString();
                videosData.push(videoData);
            }
            
            // Process all videos
            await this.addMultipleVideos(videosData);
            
            // Clear all forms
            document.getElementById('formsContainer').innerHTML = '';
            this.addVideoForm(); // Add one fresh form
            
            // Refresh video list
            await this.loadCurrentVideos();
            
            this.showStatus(`Successfully added ${videosData.length} videos! Download all files and upload them to your site.`, 'success');
        } catch (error) {
            this.showStatus('Error adding videos: ' + error.message, 'error');
        } finally {
            submitAllBtn.disabled = false;
            loading.style.display = 'none';
        }
    }

    async addMultipleVideos(videosDataArray) {
        // Load current videos from all pages
        await this.loadAllVideos();
        
        // Ensure ALL existing videos have their embeds stored
        console.log('Ensuring all existing videos have embeds stored...');
        for (let video of this.videosData) {
            if (!video.videoEmbed || video.videoEmbed.trim() === '') {
                console.log(`Re-extracting embed for existing video: ${video.title}`);
                video.videoEmbed = await this.extractEmbedFromVideoPage(video.videoUrl);
                if (video.videoEmbed) {
                    this.videoStorage.set(video.videoId, video);
                    console.log(`✅ Re-stored embed for ${video.title}`);
                }
            }
        }
        
        // Add all new videos to the beginning (newest first)
        for (let i = videosDataArray.length - 1; i >= 0; i--) {
            const videoData = videosDataArray[i];
            const videoId = this.generateVideoId(videoData.title);
            
            // Store the new video with its embed code
            this.videoStorage.set(videoId, videoData);
            
            // Add to beginning of array
            this.videosData.unshift({
                ...videoData,
                videoId: videoId,
                videoEmbed: videoData.videoEmbed
            });
        }
        
        // Regenerate all pages with complete data
        await this.regeneratePages();
    }

    async addNewVideo(videoData) {
        // Store the new video with its embed code
        const videoId = this.generateVideoId(videoData.title);
        this.videoStorage.set(videoId, videoData);
        
        // Load current videos from all pages AND extract their embeds
        await this.loadAllVideos();
        
        // Ensure ALL existing videos have their embeds stored
        console.log('Ensuring all existing videos have embeds stored...');
        for (let video of this.videosData) {
            if (!video.videoEmbed || video.videoEmbed.trim() === '') {
                console.log(`Re-extracting embed for existing video: ${video.title}`);
                video.videoEmbed = await this.extractEmbedFromVideoPage(video.videoUrl);
                if (video.videoEmbed) {
                    this.videoStorage.set(video.videoId, video);
                    console.log(`✅ Re-stored embed for ${video.title}`);
                }
            }
        }
        
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
                    console.log(`Extracting embed for ${video.title} from ${video.videoUrl}...`);
                    video.videoEmbed = await this.extractEmbedFromVideoPage(video.videoUrl);
                    
                    // Store the extracted embed immediately
                    if (video.videoEmbed) {
                        this.videoStorage.set(video.videoId, video);
                        console.log(`✅ Stored embed for ${video.title}`);
                    } else {
                        console.warn(`❌ No embed found for ${video.title}`);
                    }
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
        try {
            console.log('🚀 Starting ZIP generation...');
            
            // Load JSZip library
            let JSZip = window.JSZip;
            if (!JSZip) {
                console.log('Loading JSZip library...');
                JSZip = await this.loadJSZip();
            }
            
            const zip = new JSZip();
            
            // Create folders
            const rootFolder = zip.folder("root");
            const videosFolder = zip.folder("videos");
            
            // Calculate actual pages needed based on video count
            const actualPagesNeeded = Math.ceil(this.videosData.length / this.maxVideosPerPage);
            
            console.log(`📊 Total videos: ${this.videosData.length}, Pages needed: ${actualPagesNeeded}`);
            
            // Generate only the pages that have content
            for (let pageNum = 1; pageNum <= actualPagesNeeded; pageNum++) {
                const startIndex = (pageNum - 1) * this.maxVideosPerPage;
                const endIndex = startIndex + this.maxVideosPerPage;
                const pageVideos = this.videosData.slice(startIndex, endIndex);
                
                if (pageVideos.length > 0) {
                    console.log(`📄 Generating page ${pageNum} with ${pageVideos.length} videos`);
                    const pageHtml = await this.generatePageHTML(pageNum, pageVideos, actualPagesNeeded);
                    const fileName = pageNum === 1 ? 'index.html' : `page${pageNum}.html`;
                    rootFolder.file(fileName, pageHtml);
                    console.log(`✅ Added ${fileName} to ZIP`);
                } else {
                    console.log(`⏭️ Skipping page ${pageNum} - no videos`);
                }
            }
            
            // Generate all video pages
            console.log(`🎬 Generating ${this.videosData.length} video pages...`);
            for (let i = 0; i < this.videosData.length; i++) {
                const videoHtml = await this.generateVideoPageHTML(this.videosData[i], i + 1);
                const videoFileName = this.generateVideoFileName(this.videosData[i].title, i + 1);
                videosFolder.file(videoFileName, videoHtml);
                console.log(`✅ Added video page: ${videoFileName}`);
            }
            
            // Generate and download ZIP
            console.log('📦 Creating ZIP file...');
            const content = await zip.generateAsync({type: "blob"});
            console.log('💾 Downloading ZIP file...');
            this.downloadFile("site-files.zip", content, "application/zip");
            console.log('🎉 ZIP download initiated!');
            
        } catch (error) {
            console.error('❌ Error generating ZIP:', error);
            this.showStatus('Error generating ZIP file: ' + error.message, 'error');
        }
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
        
        // Update video grid
        const videoGrid = doc.querySelector('.video-grid');
        if (videoGrid) {
            videoGrid.innerHTML = '';
            
            videos.forEach((video, index) => {
                const videoCard = this.createVideoCard(video, index);
                videoGrid.appendChild(videoCard);
            });
        }
        
        // Update pagination
        this.updatePagination(doc, pageNum, totalPages);
        
        // Add global search functionality
        this.addGlobalSearchScript(doc);
        
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }

    addGlobalSearchScript(doc) {
        // Remove existing search script
        const existingScript = doc.querySelector('script:last-of-type');
        if (existingScript && existingScript.textContent.includes('searchVideos')) {
            existingScript.remove();
        }
        
        // Add new global search script
        const script = doc.createElement('script');
        script.textContent = `
        let allVideosData = [];
        let originalVideoGrid = '';
        
        // Load all videos data from all pages
        async function loadAllVideosData() {
            if (allVideosData.length > 0) return; // Already loaded
            
            const pages = ['index.html', 'page2.html', 'page3.html', 'page4.html', 'page5.html', 'page6.html'];
            
            for (const page of pages) {
                try {
                    const response = await fetch(page);
                    if (!response.ok) continue;
                    
                    const html = await response.text();
                    const parser = new DOMParser();
                    const pageDoc = parser.parseFromString(html, 'text/html');
                    const videoCards = pageDoc.querySelectorAll('.video-card');
                    
                    videoCards.forEach(card => {
                        const title = card.getAttribute('data-title');
                        const description = card.getAttribute('data-description');
                        const tags = card.getAttribute('data-tags');
                        const link = card.querySelector('a').href;
                        const img = card.querySelector('img');
                        
                        allVideosData.push({
                            title: title,
                            description: description,
                            tags: tags,
                            link: link,
                            thumbnail: img ? img.src : '',
                            html: card.outerHTML,
                            page: page
                        });
                    });
                } catch (error) {
                    console.log('Could not load page:', page);
                }
            }
        }
        
        async function searchVideos() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase().trim();
            const videoGrid = document.querySelector('.video-grid');
            
            if (!originalVideoGrid) {
                originalVideoGrid = videoGrid.innerHTML;
            }
            
            if (searchTerm === '') {
                // Restore original content
                videoGrid.innerHTML = originalVideoGrid;
                return;
            }
            
            // Load all videos data if not already loaded
            await loadAllVideosData();
            
            // Filter videos based on search term
            const matchingVideos = allVideosData.filter(video => {
                return video.title.toLowerCase().includes(searchTerm) ||
                       video.description.toLowerCase().includes(searchTerm) ||
                       video.tags.toLowerCase().includes(searchTerm);
            });
            
            // Display matching videos
            if (matchingVideos.length === 0) {
                videoGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ccc;"><h3>No videos found</h3><p>Try different search terms</p></div>';
            } else {
                videoGrid.innerHTML = matchingVideos.map(video => video.html).join('');
            }
        }
        
        // Clear search when search box is empty
        document.getElementById('searchBox').addEventListener('input', function() {
            if (this.value === '') {
                const videoGrid = document.querySelector('.video-grid');
                if (originalVideoGrid) {
                    videoGrid.innerHTML = originalVideoGrid;
                }
            }
        });
        
        // Load videos data on page load
        document.addEventListener('DOMContentLoaded', loadAllVideosData);
        `;
        
        doc.body.appendChild(script);
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
        this.displayCurrentVideos();
    }

    async displayCurrentVideos() {
        const videoList = document.getElementById('videoItems');
        if (this.videosData.length === 0) {
            videoList.innerHTML = '<p>No videos found. Add your first video above!</p>';
            return;
        }

        let html = '';
        this.videosData.forEach((video, index) => {
            html += `
                <div class="video-item" style="border: 1px solid #444; padding: 15px; margin: 10px 0; border-radius: 5px; background: #2a2a2a;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h4 style="color: #ff6b6b; margin: 0 0 5px 0;">${video.title}</h4>
                            <p style="color: #ccc; margin: 0 0 5px 0; font-size: 14px;">${video.description}</p>
                            <small style="color: #888;">Tags: ${video.tags}</small>
                            <div style="margin-top: 8px;">
                                <small style="color: ${video.videoEmbed ? '#4CAF50' : '#ff6b6b'};">
                                    ${video.videoEmbed ? '✅ Has embed code' : '❌ No embed code'}
                                </small>
                            </div>
                        </div>
                        <button onclick="videoManager.deleteVideo('${video.videoId}')" 
                                style="background: #ff4444; color: white; border: none; padding: 8px 12px; border-radius: 3px; cursor: pointer; margin-left: 15px;">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        // Add bulk delete option
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #333; border-radius: 5px;">
                <h4 style="color: #ff9800; margin: 0 0 10px 0;">🧹 Bulk Actions</h4>
                <button onclick="videoManager.deleteAllVideos()" 
                        style="background: #ff4444; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer; margin-right: 10px;">
                    🗑️ Delete All Videos
                </button>
                <button onclick="videoManager.deleteVideosWithoutEmbeds()" 
                        style="background: #ff9800; color: white; border: none; padding: 10px 15px; border-radius: 3px; cursor: pointer;">
                    🧹 Delete Videos Without Embeds
                </button>
            </div>
        `;
        
        videoList.innerHTML = html;
    }

    // Delete individual video
    async deleteVideo(videoId) {
        if (!confirm('Are you sure you want to delete this video?')) return;
        
        // Remove from storage
        this.videoStorage.delete(videoId);
        
        // Remove from current data
        this.videosData = this.videosData.filter(video => video.videoId !== videoId);
        
        // Refresh display and regenerate files
        this.displayCurrentVideos();
        await this.downloadAllFiles();
        
        this.showStatus('Video deleted! Download and upload the new files.', 'success');
    }

    // Delete all videos
    async deleteAllVideos() {
        if (!confirm('Are you sure you want to delete ALL videos? This cannot be undone!')) return;
        
        // Clear storage
        this.videoStorage.clear();
        this.videosData = [];
        
        // Refresh display and regenerate files
        this.displayCurrentVideos();
        await this.downloadAllFiles();
        
        this.showStatus('All videos deleted! Download and upload the new files.', 'success');
    }

    // Delete videos without embed codes
    async deleteVideosWithoutEmbeds() {
        const videosWithoutEmbeds = this.videosData.filter(video => !video.videoEmbed || video.videoEmbed.trim() === '');
        
        if (videosWithoutEmbeds.length === 0) {
            this.showStatus('No videos without embeds found.', 'info');
            return;
        }
        
        if (!confirm(`Delete ${videosWithoutEmbeds.length} videos without embed codes?`)) return;
        
        // Remove videos without embeds
        videosWithoutEmbeds.forEach(video => {
            this.videoStorage.delete(video.videoId);
        });
        
        this.videosData = this.videosData.filter(video => video.videoEmbed && video.videoEmbed.trim() !== '');
        
        // Refresh display and regenerate files
        this.displayCurrentVideos();
        await this.downloadAllFiles();
        
        this.showStatus(`Deleted ${videosWithoutEmbeds.length} videos without embeds! Download and upload the new files.`, 'success');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.videoManager = new VideoManager();
});
