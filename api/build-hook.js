const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    try {
        console.log('Build hook triggered - generating HTML files...');
        
        // Import the build functions
        const { buildHTMLFiles } = require('../build.js');
        
        // Run the build process
        await buildHTMLFiles();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'HTML files generated successfully',
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Build hook error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to generate HTML files',
                details: error.message
            })
        };
    }
};
