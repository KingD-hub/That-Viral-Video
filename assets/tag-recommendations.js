/**
 * Tag-Based Video Recommendations System
 * Automatically generates "More Like This" sections based on video tags
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTagRecommendations);
    } else {
        initTagRecommendations();
    }
    
    function initTagRecommendations() {
        // Only run on video pages (not on index page)
        if (window.location.pathname.includes('/videos/') || window.location.pathname.includes('\\videos\\')) {
            generateTagBasedRecommendations();
        }
    }
    
    async function generateTagBasedRecommendations() {
        try {
            // Get current video's tags from the page title or meta tags
            const currentVideoTags = getCurrentVideoTags();
            
            if (!currentVideoTags || currentVideoTags.length === 0) {
                console.log('Tag Recommendations: No tags found for current video');
                return;
            }
            
            // Fetch all videos from the main site
            const allVideos = await fetchAllVideos();
            
            if (!allVideos || allVideos.length === 0) {
                console.log('Tag Recommendations: No videos found to recommend');
                return;
            }
            
            // Find videos with similar tags
            const recommendations = findSimilarVideos(currentVideoTags, allVideos);
            
            // Update the "More Like This" section
            updateMoreLikeThisSection(recommendations);
            
            console.log('Tag Recommendations: Generated recommendations based on tags:', currentVideoTags);
            
        } catch (error) {
            console.error('Tag Recommendations Error:', error);
            // Fallback to existing recommendations if any error occurs
        }
    }
    
    function getCurrentVideoTags() {
        // Try to extract tags from the current video page
        // Method 1: Check if tags are embedded in the page
        const tagsMeta = document.querySelector('meta[name="tags"]');
        if (tagsMeta) {
            return tagsMeta.getAttribute('content').split(',').map(tag => tag.trim().toLowerCase());
        }
        
        // Method 2: Extract from page title patterns
        const title = document.title.toLowerCase();
        const commonTags = [
            'doggy', 'doggystyle', 'doggy style',
            'big ass', 'fat ass', 'bbw',
            'mom', 'son', 'mature',
            'teen', 'amateur', 'homemade',
            'anal', 'hardcore', 'missionary',
            'arab', 'hijab', 'asian',
            'latina', 'blonde', 'brunette',
            'creampie', 'cumshot', 'blowjob'
        ];
        
        const foundTags = [];
        commonTags.forEach(tag => {
            if (title.includes(tag)) {
                foundTags.push(tag);
            }
        });
        
        return foundTags;
    }
    
    async function fetchAllVideos() {
        try {
            // Fetch the main index page to get all video data
            const response = await fetch('/index.html');
            if (!response.ok) {
                // Try relative path
                const response2 = await fetch('../index.html');
                if (!response2.ok) {
                    throw new Error('Could not fetch video data');
                }
                const html = await response2.text();
                return parseVideosFromHTML(html);
            }
            const html = await response.text();
            return parseVideosFromHTML(html);
        } catch (error) {
            console.error('Error fetching videos:', error);
            return [];
        }
    }
    
    function parseVideosFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const videoCards = doc.querySelectorAll('.video-card[data-tags]');
        
        const videos = [];
        videoCards.forEach(card => {
            const title = card.getAttribute('data-title');
            const description = card.getAttribute('data-description');
            const tags = card.getAttribute('data-tags');
            const link = card.querySelector('a');
            const img = card.querySelector('img');
            
            if (title && tags && link && img) {
                // Don't include current video in recommendations
                const videoPath = link.getAttribute('href');
                const currentPath = window.location.pathname;
                const currentFile = currentPath.split('/').pop() || currentPath.split('\\').pop();
                const videoFile = videoPath.split('/').pop();
                
                if (videoFile !== currentFile) {
                    videos.push({
                        title: title,
                        description: description,
                        tags: tags.split(',').map(tag => tag.trim().toLowerCase()),
                        href: videoPath,
                        thumbnail: img.getAttribute('src'),
                        alt: img.getAttribute('alt') || title
                    });
                }
            }
        });
        
        return videos;
    }
    
    function findSimilarVideos(currentTags, allVideos) {
        const recommendations = [];
        
        allVideos.forEach(video => {
            let matchScore = 0;
            let matchedTags = [];
            
            // Calculate how many tags match
            currentTags.forEach(currentTag => {
                video.tags.forEach(videoTag => {
                    // Exact match or partial match
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
                recommendations.push({
                    ...video,
                    matchScore: matchScore,
                    matchedTags: matchedTags
                });
            }
        });
        
        // Sort by match score (highest first), then by title
        recommendations.sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            return a.title.localeCompare(b.title);
        });
        
        // Return top 6 recommendations
        return recommendations.slice(0, 6);
    }
    
    function updateMoreLikeThisSection(recommendations) {
        const relatedSection = document.querySelector('.related');
        if (!relatedSection) {
            console.log('Tag Recommendations: No related section found');
            return;
        }
        
        const gridContainer = relatedSection.querySelector('.grid');
        if (!gridContainer) {
            console.log('Tag Recommendations: No grid container found');
            return;
        }
        
        if (recommendations.length === 0) {
            // Keep existing recommendations if no tag matches found
            console.log('Tag Recommendations: No matching videos found, keeping existing recommendations');
            return;
        }
        
        // Clear existing recommendations
        gridContainer.innerHTML = '';
        
        // Add new tag-based recommendations
        recommendations.forEach(video => {
            // Format matched tags for display
            const tagsDisplay = video.matchedTags && video.matchedTags.length > 0
                ? `<p style="font-size: 11px; color: #999; margin-top: 5px;">${video.matchedTags.join(', ')}</p>`
                : '';
            
            const cardHTML = `
                <a class="card" href="${video.href}">
                    <div class="thumb">
                        <img src="${video.thumbnail}" alt="${video.alt}" loading="lazy">
                    </div>
                    <div class="card-body">
                        <h3>${video.title}</h3>
                        ${tagsDisplay}
                    </div>
                </a>
            `;
            gridContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        console.log(`Tag Recommendations: Updated with ${recommendations.length} recommendations`);
    }
})();
