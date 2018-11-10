var ConfigObject = function() {
	var self = this;
	
	this.baseResource = '/resources/';
	this.GameModeDir = '[cts]/'; // set to '' to ignore 
	this.debug = true;
	
	this.path = require('path');
	this.chokidar = require('chokidar');
	this.fs = require("fs");
	
	this.managedDirs = [
		/*{
			
			resource: 'test', 
			dirs:[
				{dir:'here', fileType:'.json', watcher: false} // getResourceDir(resource) + [0].dir
			]
		}*/
	];
	
	this.getResourceDir = function(resourceName) {
		return self.path.join(process.cwd(), self.baseResource + self.GameModeDir + resourceName);
	}
	
	this.getDirPath = function(path, dir) {
		return self.path.join(path, '/' + dir);
	}
}

var Config = new ConfigObject();