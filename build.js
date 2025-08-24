const fs = require('fs');
const path = require('path');

// Build script to generate HTML files from markdown
function buildHTMLFiles() {
    try {
        const videosFolder = path.join(__dirname, 'videos');
        
        // Read all markdown files
        const files = fs.readdirSync(videosFolder);
        const mdFiles = files.filter(file => file.endsWith('.md'));
        
        console.log(`Found ${mdFiles.length} markdown files to process...`);
        
        for (const mdFile of mdFiles) {
            const mdPath = path.join(videosFolder, mdFile);
            const content = fs.readFileSync(mdPath, 'utf8');
            
            // Parse the markdown content
            const videoData = parseMarkdownContent(content);
            
            if (videoData) {
                // Generate HTML file
                const htmlContent = generateHTMLTemplate(videoData);
                const htmlFilename = mdFile.replace('.md', '.html');
                const htmlPath = path.join(videosFolder, htmlFilename);
                
                // Write the HTML file
                fs.writeFileSync(htmlPath, htmlContent);
                console.log(`✅ Generated: ${htmlFilename}`);
            } else {
                console.log(`❌ Failed to parse: ${mdFile}`);
            }
        }
        
        console.log('Build completed successfully!');
        
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

function parseMarkdownContent(content) {
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
        
        return videoData;
        
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return null;
    }
}

function generateHTMLTemplate(videoData) {
    const currentYear = new Date().getFullYear();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Watch — ${videoData.title || 'Video'}</title>

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
            <h1>${videoData.title || 'Video Title'}</h1>
            <p class="meta">Posted ${videoData.date || new Date().toISOString().split('T')[0]} · 18+</p>

            <div class="player-wrap">
                <div class="responsive-embed">
                    <button class="fullscreen-btn" onclick="toggleFullscreen()">⛶ Fullscreen</button>
                    ${videoData.video_embed || '<!-- Video embed will be here -->'}
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

// Run the build if this script is executed directly
if (require.main === module) {
    buildHTMLFiles();
}

module.exports = { buildHTMLFiles, parseMarkdownContent, generateHTMLTemplate };
