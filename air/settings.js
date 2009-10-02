

SettingsStore = Class.create({
	initialize: function(parent) {
		this.parent = parent;
		this.removed = false;
	},
	
	save: function() {
		air.trace('saving settings for single remote');
		var callback = this.parent.save.bind(this.parent);
		callback();
	},
	
	remove: function() {
		this.removed = true;
		this.save();
	},
	
	extendObject: function(o) {
		for (property in this.parent.defaults) {
			o[property] = this[property];
		}
	}
});


SettingsController = Class.create({		
	initialize: function(settings) {
		air.trace('SettingsController initialized');
		
		this.remotes = [];
		this.defaults = settings;
		this.prefs = air.File.applicationStorageDirectory.resolvePath("configuration.xml");
	
		air.trace(this.prefs.nativePath);
	
		if (this.prefs.exists) {
			air.trace('XML style configuration detected');
			
			var stream = new air.FileStream();
			stream.open(this.prefs, air.FileMode.READ);
			var data = stream.readUTFBytes(stream.bytesAvailable);
			stream.close();

			var domParser = new DOMParser();
			data = domParser.parseFromString(data, "text/xml");
			
			air.trace('XML: read');
			
			var remotes = data.getElementsByTagName('remote');

			air.trace('XML: ' + remotes.length + 'remotes found');
			
			if (remotes.length) {
				for (i = 0; i < remotes.length; i++) {
					var remote = new SettingsStore(this);
				
					for (property in this.defaults) {
						var element = remotes[i].getElementsByTagName(property)[0];
					
						if (element) {
							remote[property] = element.getAttribute('value');
						}
						else {
							remote[property] = this.defaults[property];
						}
					}
				
					this.remotes.push(remote);
				}
			}
			else {
				var remote = new SettingsStore(this);
				
				for (property in this.defaults) {
					var element = data.getElementsByTagName(property)[0];
					
					if (element) {
						remote[property] = element.getAttribute('value');
					}
					else {
						remote[property] = this.defaults[property];
					}
				}
				
				this.remotes.push(remote);
			}
		} else {
			air.trace('Encrypted store configuration detected');

			// Retrieve any information from the encrypted store
			var remote = new SettingsStore(this);
			
			for (property in this.defaults) {
				remote[property] = this.getFromEncryptedStore(property, this.defaults[property]);
			}

			this.remotes.push(remote);
		}
	},
	
	save: function() {
		air.trace('saving settings for all remotes');

		var cr = air.File.lineEnding;
		var data = "<?xml version='1.0' encoding='utf-8'?>" + cr;
		data += "<settings>" + cr;
		
		for (i = 0; i < this.remotes.length; i++) {
			if (! this.remotes[i].removed) {
				data += "<remote>" + cr;
				
				for (property in this.defaults) {
					data += "<" + property + " value=\"" + this.remotes[i][property] + "\" />" + cr;
				}
				
				data += "</remote>" + cr;
			}
		}
		
		data += "</settings>" + cr;

		var stream = new air.FileStream();
		stream.open(this.prefs, air.FileMode.WRITE);
		stream.writeUTFBytes(data);
		stream.close();
	},
	

	/* Old way of storing settings */
	getFromEncryptedStore: function(property, value) {
		var store = air.EncryptedLocalStore.getItem(property);
		return store != null ? store.readUTFBytes(store.bytesAvailable) : value;
	},
	
	putIntoEncryptedStore: function(property, value) {
		var data = new air.ByteArray();
		data.writeUTFBytes(value);
		air.EncryptedLocalStore.removeItem(property);
		air.EncryptedLocalStore.setItem(property, data);
	}
});
	