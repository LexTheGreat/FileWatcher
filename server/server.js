/*
console.log("[ResourceName] Waiting for FileWatcher...")
var FWTimeout = setInterval(FWTimeoutFunc, 5000);
function FWTimeoutFunc() {
	if (exports.FileWatcher.createWatcher != undefined && exports.FileWatcher.createWatcher != null) {
		exports.FileWatcher.createWatcher("ResourceName", "dirhere", ".json", 'utf8');
		clearInterval(FWTimeout);
	} else {
		console.log("[ResourceName] Waiting for FileWatcher...")
	}
}

onNet('ResourceName:dirhere:FileWatcherAdd', (fileName, fileContents) => {
	var jsonObject = JSON.parse(fileContents);
	console.log(`New File ${fileName}`);
})

onNet('ResourceName:dirhere:FileWatcherChange', (fileName, fileContents) => {
	var jsonObject = JSON.parse(fileContents);
	console.log(`Chnaged File ${fileName}`);
})

onNet('ResourceName:dirhere:FileWatcherRemove', (fileName) => {
	Config.TelportGroup.splice(Config.getTeleportGroupIndex(fileName), 1);
	console.log(`Removed File ${fileName}`);
})
*/

// ==========================================

function debugMessage(...args) {
	if (Config.debug)
		console.log(...args);
}

on('onResourceStop', (resourceName) => {
	if (hasResource(resourceName)) {
		unregisterResource(resourceName);
	}
})

function hasResource(resourceName) {
	for (var i = 0; i < Config.managedDirs.length; i++) {
		if (Config.managedDirs[i].resource == resourceName)
			return i;
	}
	
	return -1;
}

function hasDir(resourceObject, dirName) {
	for (var i = 0; i < resourceObject.dirs.length; i++) {
		if (resourceObject.dirs[i].dir == dirName)
			return i;
	}
	
	return -1;
}

// =========================================

function registerResource(resourceName) {
	var resCheck = hasResource(resourceName) 
	if (resCheck != -1) {
		debugMessage("[WATCHER:] already controls", resourceName, "going to unregister!");
		unregisterResource(resourceName)
	}

	Config.managedDirs.push({
		resource: resourceName,
		dirs: [
			
		]
	});
	
	debugMessage('[WATCHER:DEBUG] Resource registered', resourceName);
	
	return Config.managedDirs.length-1; // return index of new resource object
}

function unregisterResource(resourceName) {
	var resCheck = hasResource(resourceName) 
	if (resCheck == -1) {
		debugMessage("[WATCHER:] no resource found under", resourceName);
		return;
	}
	
	
	
	var resourceObject = Config.managedDirs[resCheck];
	for (var i = 0; i < resourceObject.dirs.length; i++) {
		if (resourceObject.dirs[i].watcher != false) {
			debugMessage("[WATCHER] Removed", resourceName, "control on", resourceObject.dirs[i].dir);
			resourceObject.dirs[i].watcher.close();
			resourceObject.dirs[i].watcher = false;
		}
	}
	
	debugMessage("[WATCHER:DEBUG] Watched dirs removed:", resourceObject.dirs.length);
	Config.managedDirs.splice(resCheck, 1);
	debugMessage('[WATCHER:DEBUG] Resource unregistered', resourceName, " Remaining resources:", Config.managedDirs.length);
}

// ========================================

function addDir(resourceName, dir, fileType) { // TODO, for now just do one per dir, but maybe want more than one later
	var resCheck = hasResource(resourceName) 
	if (resCheck == -1) {
		debugMessage("[WATCHER:] no resource found under", resourceName);
		return;
	}
	var resourceObject = Config.managedDirs[resCheck];
	
	var dirCheck = hasDir(resourceObject, dir) 
	if (dirCheck != -1) {
		debugMessage("[WATCHER:]", resourceName, "already controls", dir);
		return;
	}
	
	resourceObject.dirs.push({dir:dir, fileType:fileType, watcher: false});
	return resourceObject.dirs.length-1; // return index of new object
}

function removeDir(resourceName, dir) {
	var resCheck = hasResource(resourceName) 
	if (resCheck == -1) {
		debugMessage("[WATCHER:] no resource found under", resourceName);
		return;
	}
	var resourceObject = Config.managedDirs[resCheck];
	
	var dirCheck = hasDir(resourceObject, dir) 
	if (dirCheck == -1) {
		debugMessage("[WATCHER:]", resourceName, "doesn't control", dir);
		return;
	}
	
	resourceObject.dirs.splice(dirCheck, 1);
}

//============================================

//TODO
function createWatcher(resourceName, dir, fileType, encoding) {
	setTimeout(function(){})
	var resCheck = hasResource(resourceName) 
	if (resCheck == -1) {
		debugMessage("[WATCHER:DEBUG] no resource found. Adding", resourceName);
		resCheck = registerResource(resourceName);
	}
	var resourceObject = Config.managedDirs[resCheck];
	
	var dirCheck = hasDir(resourceObject, dir) 
	if (dirCheck == -1) {
		debugMessage("[WATCHER:DEBUG]", resourceName, "doesn't control this. Adding", dir);
		dirCheck = addDir(resourceName, dir, fileType);
	}
	var dirObject = resourceObject.dirs[dirCheck];
	
	if (dirObject.watcher != false) {
		debugMessage('[WATCHER:ERR]', resourceName, "already controls", dir);
		return false;
	}
	
	debugMessage('[WATCHER:DEBUG] added new watcher', resourceName, dir, fileType);
	
	if (encoding == undefined) {
		encoding = null; // null == buffer
	}
	
	dirObject.watcher = Config.chokidar.watch(Config.getDirPath(Config.getResourceDir(resourceName), dir), {persistent: true});
	dirObject.watcher.on('add', function(path) {
		if (path.endsWith(fileType)) {
			try {
				var fileContents = fs.readFileSync(path, encoding);
				var fileName = Config.path.parse(path).name;

				debugMessage('[WATCHER:DEBUG]', resourceName, 'new file', fileName);
				debugMessage('[WATCHER:DEBUG]', `${resourceName}:${dir}:FileWatcherAdd`);
				setTimeout(function(){ // Workaround crash fix for buffer error? Might push this to the right thread.
					pushEvent(resourceName + ':' + dir + ':FileWatcherAdd', [fileName, fileContents]);
				}, 1)
			} catch(e){
				debugMessage(e);
			}
		} else {
			dirObject.watcher.unwatch(path);
		}
	}).on('change', function(path) {
		if (path.endsWith(fileType)) {
			try {
				var fileContents = fs.readFileSync(path, encoding);
				var fileName = Config.path.parse(path).name;
				
				debugMessage('[WATCHER:DEBUG]', resourceName, 'file changed', fileName);
				setTimeout(function(){ // Workaround crash fix for buffer error? Might push this to the right thread.
					pushEvent(resourceName + ':' + dir + ':FileWatcherChange', [fileName, fileContents]);
				}, 1)
			} catch(e){
				debugMessage(e);
			}
		} else {
			dirObject.watcher.unwatch(path);
		}
	}).on('unlink', function(path) {
		if (path.endsWith(fileType)) {
			var fileName = Config.path.parse(path).name;
			
			debugMessage('[WATCHER:DEBUG]', resourceName, 'file removed', fileName);
			setTimeout(function(){ // Workaround crash fix for buffer error? Might push this to the right thread.
				pushEvent(resourceName + ':' + dir + ':FileWatcherRemove', [fileName]);
			}, 1)
		}
	}).on('error', function(error) {
		console.error('[WATCHER:ERR]', error);
	});
	
	return true;
}

function removeWatcher(resourceName) {
	var resCheck = hasResource(resourceName) 
	if (resCheck == -1) {
		debugMessage("[WATCHER:ERR] no resource found under", resourceName);
		return;
	}
	var resourceObject = Config.managedDirs[resCheck];
	
	if (resourceObject.watcher == false) {
		debugMessage("[WATCHER:ERR] no watcher found for", resourceName);
		return;
	}
	
	resourceObject.watcher.close();
	resourceObject.watcher = false;
}

// Can't use setTimeout then use exports...............
emitNetSync = [];
emitSync = [];

setTick(() => {
	if (emitNetSync.length != 0) {
		var argsS = emitNetSync.shift()
		emitNet.apply(this, argsS);
	}
	if (emitSync.length != 0) {
		var args = emitSync.shift()
		emit.apply(this, args);
	}
});

function pushEventNet(eventName, source, eventArgs) {
	var args = [eventName, source];
	args = args.concat(eventArgs)
	emitNetSync.push(args);
}

function pushEvent(eventName, eventArgs) {
	var args = [eventName];
	args = args.concat(eventArgs)
	emitSync.push(args);
}