/*                     __    __               .___                         _____.__               
_____________   _____/  |__/  |_ ___.__.   __| _/____    _____   ____   _/ ____\__| ____   ____  
\____ \_  __ \_/ __ \   __\   __<   |  |  / __ |\__  \  /     \ /    \  \   __\|  |/    \_/ __ \ 
|  |_> >  | \/\  ___/|  |  |  |  \___  | / /_/ | / __ \|  Y Y  \   |  \  |  |  |  |   |  \  ___/ 
|   __/|__|    \___  >__|  |__|  / ____| \____ |(____  /__|_|  /___|  /  |__|  |__|___|  /\___  >
|__|               \/            \/           \/     \/      \/     \/                 \/     \/ 

*/
var sys = require('sys');
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var exec  = require('child_process').exec;
var crypto = require('crypto');
var express = require("express");
var crypto = require('crypto');

LOGGING = true;

popplerPath = "~/poppler-http/build/utils/"
pdfsDir = "pdfs/";

var app = express.createServer(); 
app.use(express.static(__dirname + "/static"));
app.use(express.static(__dirname + "/pdfs"));
app.listen(8080);
var everyone = require("now").initialize(app, {rememberTransport: false});


//
// RPC's
//

// Use this to get image of a page, callback gives you the path to the PNG
everyone.now.pageRequest = function(pdfUri, page, callback) {
	var mdsum = crypto.createHash('md5');
	mdsum.update(pdfUri);
	var pdfHash = mdsum.digest('hex');
	var imagePath = pdfsDir + pdfHash + "-" + page + ".png";

	path.exists(imagePath, function (exists) {
  		if(!exists) {
			var cmd = popplerPath + ["pdftoppm -rx 72 -ry 72 -f", page, "-l", page, "-png", pdfUri, ">", imagePath].join(" ");

			if (LOGGING) sys.log(cmd);
			exec(cmd, function (error, stdout, stderr) {
				callback(pdfHash + "-" + page + ".png");
		  	});
		} else {
			if (LOGGING) sys.log("Serving cached.");
			callback(pdfHash + "-" + page + ".png");
		}
	});
}

//
// Parse data returned by 'pdfinfo' command.
//
function parseGetInfo(data) {
	// TODO: These regex's seem overly verbose...
	var parsed = { 
		pages 	: 	((data.match(/Pages:\s*[\d\.]+/))[0].match(/[\d\.]+/))[0],
		width	:	((data.match(/Page[\s\S]{26}/g))[1].match(/\d+\w/g))[0],
		height	:	((data.match(/Page[\s\S]{26}/g))[1].match(/\d+\w/g))[1]	
	};
	console.log(data);
	console.log(parsed);
	return parsed;
}

everyone.now.getInfo = function(pdfUri, callback) {
	var mdsum = crypto.createHash('md5');
	mdsum.update(pdfUri);
	var pdfHash = mdsum.digest('hex');
	var infoPath = pdfsDir + pdfHash + "-info.txt";

	path.exists(infoPath, function(exists) {
		// If we dont have a cached info file create one
		if(!exists) {
			var cmd = popplerPath + "pdfinfo " + pdfUri + " > " + infoPath;
  			sys.log(cmd);
  			exec(cmd, function (error, stdout, stderr) {
    			sys.log("Create info file: " + infoPath);

				fs.readFile(infoPath, "utf-8", function (err, data) {
					callback(parseGetInfo(data));
				});
			});
		} else {
			fs.readFile(infoPath, "utf-8", function (err, data) {
				callback(parseGetInfo(data));
			});
		} 
	});
}

everyone.now.getText = function(pdfUri, page, x, y, width, height, callback) {
	var cmd = popplerPath +["pdftotext", pdfUri, "-f", page, "-l", page, "-layout", "-x", x, "-y", y, "-W", width, "-H", height, "/dev/stdout"].join(" ");
  	sys.log(cmd);
  	exec(cmd, function (error, stdout, stderr) {
    	callback(stdout);
	});
}
