const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    try {
        // Read site configuration
        const siteConfigPath = path.join(process.cwd(), 'site-config.json');
        const siteConfig = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
        
        // Read videos from the videos folder (both .md and .html files)
        const videosFolder = path.join(process.cwd(), 'videos');
        const videoFiles = fs.readdirSync(videosFolder).filter(file => 
            file.endsWith('.html') || file.endsWith('.md')
        );
        
        const videos = [];
        
        // Process each video file
        for (const file of videoFiles) {
            const filePath = path.join(videosFolder, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (file.endsWith('.md')) {
                // Parse markdown file from Netlify CMS
                const videoData = parseMarkdownVideo(content, file);
                if (videoData) {
                    videos.push(videoData);
                }
            } else if (file.endsWith('.html')) {
                // Parse HTML file (existing videos)
                const videoData = parseHtmlVideo(content, file);
                if (videoData) {
                    videos.push(videoData);
                }
            }
        }
        
        // Sort videos by date (newest first)
        videos.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // If no videos found, use fallback
        if (videos.length === 0) {
            videos.push(...getStaticVideos());
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                videos: videos,
                config: siteConfig
            })
        };
        
    } catch (error) {
        console.error('Error loading videos:', error);
        
        // Fallback to static videos
        const staticVideos = getStaticVideos();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                videos: staticVideos,
                config: siteConfig || {}
            })
        };
    }
};

// Parse markdown file from Netlify CMS
function parseMarkdownVideo(content, filename) {
    try {
        // Extract YAML front matter
        const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!yamlMatch) return null;
        
        const yamlContent = yamlMatch[1];
        const lines = yamlContent.split('\n');
        const videoData = {};
        
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                videoData[key] = value;
            }
        }
        
        // Create video object
        return {
            title: videoData.title || 'Untitled Video',
            description: videoData.description || '',
            tags: videoData.tags || '',
            thumbnail: videoData.thumbnail || '',
            video_embed: videoData.video_embed || '',
            featured: videoData.featured === 'true',
            page: parseInt(videoData.page) || 1,
            position: parseInt(videoData.position) || 1,
            date: videoData.date || new Date().toISOString().split('T')[0],
            draft: videoData.draft === 'true',
            url: `videos/${filename.replace('.md', '.html')}`,
            filename: filename
        };
        
    } catch (error) {
        console.error('Error parsing markdown video:', error);
        return null;
    }
}

// Parse HTML file (existing videos)
function parseHtmlVideo(content, filename) {
    try {
        // Extract title from HTML
        const titleMatch = content.match(/<title[^>]*>Watch — ([^<]+)<\/title>/);
        const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
        
        const title = h1Match ? h1Match[1] : (titleMatch ? titleMatch[1] : 'Untitled Video');
        
        // Extract iframe src
        const iframeMatch = content.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
        const videoEmbed = iframeMatch ? `<iframe src="${iframeMatch[1]}" frameborder="0" width="560" height="315" scrolling="no" allowfullscreen></iframe>` : '';
        
        return {
            title: title,
            description: 'Video description',
            tags: 'video,tags',
            thumbnail: '',
            video_embed: videoEmbed,
            featured: false,
            page: 1,
            position: 1,
            date: new Date().toISOString().split('T')[0],
            draft: false,
            url: `videos/${filename}`,
            filename: filename
        };
        
    } catch (error) {
        console.error('Error parsing HTML video:', error);
        return null;
    }
}

// Fallback static videos
function getStaticVideos() {
    return [
        {
            title: "hardsex BBC hdporn xxx",
            description: "Hot BBC action in HD quality. Click to watch now.",
            tags: "cheating,wife,moriah mills",
            thumbnail: "https://cdn77-pic.xvideos-cdn.com/videos/thumbs169lll/39/83/47/39834767c87518f4e747459db314f345/39834767c87518f4e747459db314f345.13.jpg",
            url: "videos/first-video.html",
            page: 1,
            position: 1
        },
        {
            title: "Leak Video Of Miracle From Her University Days",
            description: "Spicy leaks that will leave you wanting more.",
            tags: "leaks,hardcore,spicy",
            thumbnail: "https://drive.google.com/thumbnail?id=1cisRBdBC_jhh-PfENmhGtwAl0KJatDgv",
            url: "videos/second-video.html",
            page: 1,
            position: 2
        },
        {
            title: "Asian Teen Takes It All",
            description: "Young Asian beauty ready for action. Click to watch now.",
            tags: "asian,teen,beauty",
            thumbnail: "https://pix-cdn77.phncdn.com/c6371/videos/202507/20/16545975/original_16545975.mp4/plain/ex:1:no/bg:0:0:0/rs:fit:320:180/vts:52?hash=Yb2eC-1hq5CrPno08yA5OHauuyc=&validto=4891363200",
            url: "videos/third-video.html",
            page: 1,
            position: 3
        },
        {
            title: "Cheating Wife (Moriah Mills) Gets Drilled By Husbands Pal",
            description: "Dick in between ass cheeks. Click to watch now.",
            tags: "cheating,wife,moriah mills",
            thumbnail: "https://gcore-pic.xvideos-cdn.com/videos/thumbs169lll/22/e5/59/22e55995427a107de19f41cffd1ad2b2/22e55995427a107de19f41cffd1ad2b2.9.jpg",
            url: "videos/fourth-video.html",
            page: 1,
            position: 4
        },
        {
            title: "She let him fuck her ass hole for job",
            description: "Job interview takes an unexpected turn.",
            tags: "job,interview,ass",
            thumbnail: "https://drive.google.com/thumbnail?id=1P69-qsgWKSD173hkuyWjUeh49DOth2ke",
            url: "videos/fifth-video.html",
            page: 1,
            position: 5
        }
    ];
}
