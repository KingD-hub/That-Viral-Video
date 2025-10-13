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
        // Process in normal order so last form filled becomes newest
        for (let i = 0; i < videosDataArray.length; i++) {
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
        // Use ZIP download for adding videos
        await this.downloadAllFiles();
    }

    async forceSimpleDownloads() {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        console.log('🚀 Starting simple file downloads...');
        
        // Calculate actual pages needed
        const actualPagesNeeded = Math.ceil(this.videosData.length / this.maxVideosPerPage);
        
        // Download main pages
        for (let pageNum = 1; pageNum <= actualPagesNeeded; pageNum++) {
            const startIndex = (pageNum - 1) * this.maxVideosPerPage;
            const endIndex = startIndex + this.maxVideosPerPage;
            const pageVideos = this.videosData.slice(startIndex, endIndex);
            
            if (pageVideos.length > 0) {
                const pageHtml = await this.generatePageHTML(pageNum, pageVideos, actualPagesNeeded);
                const fileName = pageNum === 1 ? 'index.html' : `page${pageNum}.html`;
                
                // Force download immediately
                const blob = new Blob([pageHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log(`✅ Downloaded: ${fileName}`);
                await delay(800);
            }
        }
        
        // Download video pages
        for (let i = 0; i < this.videosData.length; i++) {
            const videoHtml = await this.generateVideoPageHTML(this.videosData[i], i + 1);
            const videoFileName = this.generateVideoFileName(this.videosData[i].title, i + 1);
            
            // Force download immediately
            const blob = new Blob([videoHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = videoFileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`✅ Downloaded video: ${videoFileName}`);
            await delay(600);
        }
        
        console.log('🎉 All downloads completed!');
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
        const paginationNav = doc.querySelector('.pagination-nav');
        if (!paginationNav) return;
        
        paginationNav.innerHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            const prevLink = document.createElement('a');
            prevLink.className = 'pagination-btn prev-btn';
            prevLink.href = currentPage === 2 ? 'index.html' : `page${currentPage - 1}.html`;
            prevLink.textContent = '← Previous';
            prevLink.style.cssText = 'background: #555; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; font-weight: bold; transition: background 0.3s;';
            paginationNav.appendChild(prevLink);
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                const current = document.createElement('span');
                current.className = 'page-number current';
                current.textContent = i;
                current.style.cssText = 'background: #ff6b6b; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;';
                paginationNav.appendChild(current);
            } else {
                const link = document.createElement('a');
                link.className = 'page-number';
                link.href = i === 1 ? 'index.html' : `page${i}.html`;
                link.textContent = i;
                link.style.cssText = 'background: #333; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; transition: background 0.3s;';
                paginationNav.appendChild(link);
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            const nextLink = document.createElement('a');
            nextLink.className = 'pagination-btn next-btn';
            nextLink.href = `page${currentPage + 1}.html`;
            nextLink.textContent = 'Next →';
            nextLink.style.cssText = 'background: #555; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; font-weight: bold; transition: background 0.3s;';
            paginationNav.appendChild(nextLink);
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
            playerDiv.innerHTML = videoData.videoEmbed;
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
        
        // Tag-based matching: Find videos with similar tags
        const currentTags = currentVideo.tags ? currentVideo.tags.toLowerCase().split(',').map(t => t.trim()) : [];
        const relatedVideos = [];
        
        if (currentTags.length > 0) {
            // Score each video based on tag matches
            otherVideos.forEach(video => {
                const videoTags = video.tags ? video.tags.toLowerCase().split(',').map(t => t.trim()) : [];
                let matchScore = 0;
                const matchedTags = [];
                
                currentTags.forEach(currentTag => {
                    videoTags.forEach(videoTag => {
                        if (videoTag.includes(currentTag) || currentTag.includes(videoTag)) {
                            matchScore++;
                            // Add matched tag if not already in the list
                            if (!matchedTags.includes(videoTag)) {
                                matchedTags.push(videoTag);
                            }
                        }
                    });
                });
                
                if (matchScore > 0) {
                    relatedVideos.push({ video, matchScore, matchedTags });
                }
            });
            
            // Sort by match score (highest first)
            relatedVideos.sort((a, b) => b.matchScore - a.matchScore);
        }
        
        // If no tag matches found, fall back to recent videos
        if (relatedVideos.length === 0) {
            otherVideos.slice(0, 6).forEach(video => {
                relatedVideos.push({ video, matchScore: 0, matchedTags: [] });
            });
        }
        
        // Show up to 6 related videos
        const videosToShow = relatedVideos.slice(0, 6);
        
        videosToShow.forEach(({ video, matchScore, matchedTags }) => {
            const relatedIndex = this.videosData.findIndex(v => v === video) + 1;
            const videoFileName = this.generateVideoFileName(video.title, relatedIndex);
            
            const cardDiv = document.createElement('a');
            cardDiv.className = 'card';
            cardDiv.href = videoFileName;
            
            // Format matched tags for display
            const tagsDisplay = matchedTags.length > 0 
                ? `<p style="font-size: 11px; color: #999; margin-top: 5px;">${matchedTags.join(', ')}</p>` 
                : '';
            
            cardDiv.innerHTML = `
                <div class="thumb">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
                </div>
                <div class="card-body">
                    <h3>${video.title}</h3>
                    ${tagsDisplay}
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
            console.log('🚀 Starting file downloads...');
            
            // Try ZIP first, fallback to individual files
            try {
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
                
            } catch (zipError) {
                console.warn('⚠️ ZIP generation failed, falling back to individual downloads:', zipError);
                await this.downloadIndividualFiles();
            }
            
        } catch (error) {
            console.error('❌ Error downloading files:', error);
            this.showStatus('Error downloading files: ' + error.message, 'error');
        }
    }

    async loadJSZip() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                console.log('✅ JSZip library loaded successfully');
                resolve(window.JSZip);
            };
            script.onerror = (error) => {
                console.error('❌ Failed to load JSZip library:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    // Simple individual file download (fallback)
    async downloadIndividualFiles() {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Calculate actual pages needed based on video count
        const actualPagesNeeded = Math.ceil(this.videosData.length / this.maxVideosPerPage);
        
        console.log(`📊 Downloading ${actualPagesNeeded} pages and ${this.videosData.length} video files individually...`);
        
        // Download main pages
        for (let pageNum = 1; pageNum <= actualPagesNeeded; pageNum++) {
            const startIndex = (pageNum - 1) * this.maxVideosPerPage;
            const endIndex = startIndex + this.maxVideosPerPage;
            const pageVideos = this.videosData.slice(startIndex, endIndex);
            
            if (pageVideos.length > 0) {
                const pageHtml = await this.generatePageHTML(pageNum, pageVideos, actualPagesNeeded);
                const fileName = pageNum === 1 ? 'index.html' : `page${pageNum}.html`;
                this.downloadFile(fileName, pageHtml);
                console.log(`✅ Downloaded: ${fileName}`);
                await delay(500); // 500ms delay between downloads
            }
        }
        
        // Download all video pages
        for (let i = 0; i < this.videosData.length; i++) {
            const videoHtml = await this.generateVideoPageHTML(this.videosData[i], i + 1);
            const videoFileName = this.generateVideoFileName(this.videosData[i].title, i + 1);
            this.downloadFile(videoFileName, videoHtml);
            console.log(`✅ Downloaded video: ${videoFileName}`);
            await delay(300); // 300ms delay between video downloads
        }
        
        console.log('🎉 All files downloaded individually!');
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
                const videoCard = this.createVideoCardHTML(video, index);
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
        
        // Add new script with search functionality only
        const script = doc.createElement('script');
        script.textContent = `
        // Search functionality
        function searchVideos() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const videoCards = document.querySelectorAll('.video-card');
            
            videoCards.forEach(card => {
                const title = card.getAttribute('data-title').toLowerCase();
                const description = card.getAttribute('data-description').toLowerCase();
                const tags = card.getAttribute('data-tags').toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm) || tags.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Clear search when search box is empty
        document.getElementById('searchBox').addEventListener('input', function() {
            if (this.value === '') {
                const videoCards = document.querySelectorAll('.video-card');
                videoCards.forEach(card => {
                    card.style.display = 'block';
                });
            }
        });
        `;
        
        doc.body.appendChild(script);
    }

    async generateVideoPageHTML(videoData, globalIndex) {
        // Load video template
        const templateResponse = await fetch('../video-template.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Update title
        doc.title = `Watch — ${videoData.title}`;
        const h1 = doc.querySelector('h1');
        if (h1) h1.textContent = videoData.title;
        
        // Add meta tags for video tags (for tag-based recommendations)
        const head = doc.querySelector('head');
        if (head && videoData.tags) {
            const tagsMeta = doc.createElement('meta');
            tagsMeta.setAttribute('name', 'tags');
            tagsMeta.setAttribute('content', videoData.tags);
            head.appendChild(tagsMeta);
        }
        
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

        let html = `
            <div style="margin-bottom: 20px; padding: 15px; background: #333; border-radius: 5px;">
                <h4 style="color: #ff9800; margin: 0 0 10px 0;">🎯 Bulk Selection</h4>
                <button onclick="videoManager.selectAllVideos()" 
                        style="background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 3px; cursor: pointer; margin-right: 10px;">
                    ✅ Select All
                </button>
                <button onclick="videoManager.deselectAllVideos()" 
                        style="background: #666; color: white; border: none; padding: 8px 12px; border-radius: 3px; cursor: pointer; margin-right: 10px;">
                    ❌ Deselect All
                </button>
                <button onclick="videoManager.deleteSelectedVideos()" 
                        style="background: #ff4444; color: white; border: none; padding: 8px 12px; border-radius: 3px; cursor: pointer;">
                    🗑️ Delete Selected
                </button>
            </div>
        `;
        
        this.videosData.forEach((video, index) => {
            html += `
                <div class="video-item" style="border: 1px solid #444; padding: 15px; margin: 10px 0; border-radius: 5px; background: #2a2a2a;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; align-items: flex-start; gap: 15px;">
                            <input type="checkbox" class="video-select-checkbox" value="${video.videoId}" 
                                   style="margin-top: 5px; transform: scale(1.2);">
                            <div>
                                <h4 style="margin: 0 0 5px 0; color: #fff;">${video.title}</h4>
                                <p style="margin: 0 0 5px 0; color: #ccc; font-size: 14px;">${video.description}</p>
                                <small style="color: #999;">Tags: ${video.tags}</small><br>
                                <small style="color: ${video.videoEmbed ? '#4CAF50' : '#ff4444'};">
                                    Embed: ${video.videoEmbed ? '✅ Available' : '❌ Missing'}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Add bulk delete option
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #333; border-radius: 5px;">
                <h4 style="color: #ff9800; margin: 0 0 10px 0;">🧹 Quick Actions</h4>
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
        
        // Only download if there are videos remaining
        if (this.videosData.length > 0) {
            await this.downloadAllFiles();
        } else {
            // Create empty index.html for empty site
            const emptyHtml = await this.generateEmptyIndexPage();
            const blob = new Blob([emptyHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'index.html';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        this.showStatus('Video deleted! Download and upload the new files.', 'success');
    }

    // Delete all videos
    async deleteAllVideos() {
        if (!confirm('Are you sure you want to delete ALL videos? This cannot be undone!')) return;
        
        // Clear storage
        this.videoStorage.clear();
        this.videosData = [];
        
        // Refresh display
        this.displayCurrentVideos();
        
        // Create empty index.html for empty site
        const emptyHtml = await this.generateEmptyIndexPage();
        const blob = new Blob([emptyHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
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
        
        if (this.videosData.length > 0) {
            await this.downloadAllFiles();
        } else {
            // Create empty index.html for empty site
            const emptyHtml = await this.generateEmptyIndexPage();
            const blob = new Blob([emptyHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'index.html';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        this.showStatus(`Deleted ${videosWithoutEmbeds.length} videos without embeds! Download and upload the new files.`, 'success');
    }

    // Bulk selection methods
    selectAllVideos() {
        const checkboxes = document.querySelectorAll('.video-select-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = true);
    }

    deselectAllVideos() {
        const checkboxes = document.querySelectorAll('.video-select-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    async deleteSelectedVideos() {
        const checkboxes = document.querySelectorAll('.video-select-checkbox:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showStatus('No videos selected for deletion.', 'info');
            return;
        }
        
        if (!confirm(`Delete ${selectedIds.length} selected video(s)?`)) return;
        
        // Remove selected videos from storage and data
        selectedIds.forEach(videoId => {
            this.videoStorage.delete(videoId);
        });
        
        this.videosData = this.videosData.filter(video => !selectedIds.includes(video.videoId));
        
        // Refresh display and regenerate files
        this.displayCurrentVideos();
        
        if (this.videosData.length > 0) {
            await this.downloadAllFiles();
        } else {
            // Create empty index.html for empty site
            const emptyHtml = await this.generateEmptyIndexPage();
            const blob = new Blob([emptyHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'index.html';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        this.showStatus(`Deleted ${selectedIds.length} selected video(s)! Download and upload the new files.`, 'success');
    }

    async generateEmptyIndexPage() {
        // Load template
        const templateResponse = await fetch('../index.html');
        const templateHtml = await templateResponse.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(templateHtml, 'text/html');
        
        // Clear video grid and add empty message
        const videoGrid = doc.querySelector('.video-grid');
        if (videoGrid) {
            videoGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #ccc;"><h3>No videos yet</h3><p>Add videos through the admin panel</p></div>';
        }
        
        // Remove pagination
        const pagination = doc.querySelector('.pagination');
        if (pagination) {
            pagination.remove();
        }
        
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.videoManager = new VideoManager();
});
