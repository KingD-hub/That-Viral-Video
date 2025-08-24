const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    try {
        // Read site configuration
        const siteConfigPath = path.join(process.cwd(), 'site-config.json');
        const siteConfig = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
        
        // Read videos from the videos folder
        const videosFolder = path.join(process.cwd(), 'videos');
        const videoFiles = fs.readdirSync(videosFolder).filter(file => file.endsWith('.html'));
        
        const videos = [];
        
        // For now, return the static video data
        // In a full implementation, you'd parse each video file
        const staticVideos = [
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
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                videos: staticVideos,
                config: siteConfig
            })
        };
        
    } catch (error) {
        console.error('Error loading videos:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                error: 'Failed to load videos',
                videos: []
            })
        };
    }
};
