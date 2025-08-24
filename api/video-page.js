const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    try {
        // Get the video filename from the URL
        const pathSegments = event.path.split('/');
        const filename = pathSegments[pathSegments.length - 1];
        
        if (!filename || !filename.endsWith('.html')) {
            return {
                statusCode: 404,
                body: 'Video not found'
            };
        }
        
        // Convert .html to .md to find the markdown file
        const mdFilename = filename.replace('.html', '.md');
        const mdPath = path.join(process.cwd(), 'videos', mdFilename);
        
        // Check if markdown file exists
        if (!fs.existsSync(mdPath)) {
            return {
                statusCode: 404,
                body: 'Video not found'
            };
        }
        
        // Read and parse the markdown file
        const content = fs.readFileSync(mdPath, 'utf8');
        const videoData = parseMarkdownVideo(content, mdFilename);
        
        if (!videoData) {
            return {
                statusCode: 404,
                body: 'Invalid video data'
            };
        }
        
        // Generate HTML page
        const htmlPage = generateVideoPage(videoData);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=3600'
            },
            body: htmlPage
        };
        
    } catch (error) {
        console.error('Error generating video page:', error);
        
        return {
            statusCode: 500,
            body: 'Error generating video page'
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
            filename: filename
        };
        
    } catch (error) {
        console.error('Error parsing markdown video:', error);
        return null;
    }
}

// Generate HTML page for video
function generateVideoPage(videoData) {
    const currentYear = new Date().getFullYear();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Watch — ${videoData.title}</title>

    <!-- ====== Adsterra/ExoClick POPUNDER (HEAD) ====== -->
    <script type='text/javascript' src='//pl27466028.profitableratecpm.com/1c/ec/ba/1cecba33959a73dc0225a98248e1e330.js'></script>
    
    <!-- Social Bar Ad -->
    <script type='text/javascript' src='//pl27495784.profitableratecpm.com/b0/db/62/b0db62ad1f1a1d4102ccae80a8ecdf4a.js'></script>

    <link rel="stylesheet" href="../assets/styles.css" />
</head>
<body>
    <header class="site-header">
        <div class="container">
            <a class="brand" href="../">DailyClips</a>
            <nav class="nav">
                <a href="../">Home</a>
            </nav>
        </div>
    </header>

    <main class="container">
        <article class="player-article">
            <h1>${videoData.title}</h1>
            <p class="meta">Posted ${videoData.date} · 18+</p>

            <div class="player-wrap">
                <div class="responsive-embed">
                    <button class="fullscreen-btn" onclick="toggleFullscreen()">⛶ Fullscreen</button>
                    ${videoData.video_embed}
                </div>
            </div>

            <div class="banner-slot">
                <script type="text/javascript">
                    atOptions = {
                        'key' : '8222901a4a0a0abca1bf6e66669f066d',
                        'format' : 'iframe',
                        'height' : 90,
                        'width' : 728,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="//www.highperformanceformat.com/8222901a4a0a0abca1bf6e66669f066d/invoke.js"></script>
            </div>

            <section class="related">
                <h2>More Like This</h2>
                <div class="grid">
                    <a class="card" href="../videos/first-video.html">
                        <div class="thumb">
                            <img src="https://cdn77-pic.xvideos-cdn.com/videos/thumbs169lll/39/83/47/39834767c87518f4e747459db314f345/39834767c87518f4e747459db314f345.13.jpg" alt="Related 1" loading="lazy" />
                        </div>
                        <div class="card-body">
                            <h3>hardsex BBC hdporn xxx</h3>
                        </div>
                    </a>
                    <a class="card" href="../videos/second-video.html">
                        <div class="thumb">
                            <img src="https://drive.google.com/thumbnail?id=1cisRBdBC_jhh-PfENmhGtwAl0KJatDgv" alt="Related 2" loading="lazy" />
                        </div>
                        <div class="card-body">
                            <h3>Leak Video Of Miracle From Her University Days</h3>
                        </div>
                    </a>
                </div>
            </section>
        </article>
    </main>

    <footer class="site-footer">
        <div class="container">
            <p>© ${currentYear} DailyClips · 18+ Only · <a href="../legal.html">Legal</a></p>
        </div>
    </footer>

    <script>
        document.getElementById('year').textContent = new Date().getFullYear();
        
        // Fullscreen functionality
        function toggleFullscreen() {
            const iframe = document.querySelector('.responsive-embed iframe');
            
            if (iframe) {
                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                } else if (iframe.webkitRequestFullscreen) {
                    iframe.webkitRequestFullscreen();
                } else if (iframe.msRequestFullscreen) {
                    iframe.msRequestFullscreen();
                }
            }
        }
        
        // Handle fullscreen change
        function handleFullscreenChange() {
            const iframe = document.querySelector('.responsive-embed iframe');
            if (iframe) {
                iframe.style.width = '100%';
                iframe.style.height = '100%';
            }
        }
        
        // Exit fullscreen
        function exitFullscreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        
        // Add event listeners
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
    </script>
</body>
</html>`;
}
