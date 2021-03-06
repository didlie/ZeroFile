class Files {
	constructor(fs) {
		this.fs = fs;
		this.shownPathDelim = " " + String.fromCharCode(8250) + " "; /* right arrow */
		this.root = "files";
		this.showRoot = "Root";

		this.types = {
			image: [
				"jpg", // JPEG
				"jpeg",
				"jp2", // JPEG 200
				"jpx",
				"tiff", // Tiff
				"gif", // GIF
				"bmp", // BMP
				"png", // PNG
				"webp", // WebP
				"bpg", // Better Portable Graphics
				"svg" // SVG
			],
			music: [
				"3gp", // 3GP
				"aiff", // AIFF
				"au", // Au
				"flac", // Flac
				"gsm", // GSM
				"m4a", // M4A
				"mp3", // MP3
				"ogg", // Ogg
				"oga",
				"mogg",
				"vox", // vox
				"wav", // WAV
				"wma" // WMA
			],
			video: [
				"mkv", // MKV
				"ogv", // Ogg
				"avi", // AVI
				"mov", // MOV
				"wmv", // WMV
				"mp4", // MP4
				"mpg", // MPEG
				"mpeg",
				"m4v" // M4V
			],
			text: [
				"text", // TXT
				"txt",
				"readme"
			]
		};
	}

	guessType(file) {
		return this.fs.getType(file)
			.then(type => {
				if(type == "dir") {
					return "dir";
				}

				let filename = file.split("/").slice(-1)[0].split(".");

				let ext;
				if(filename.length == 1) {
					ext = "";
				} else {
					ext = filename[filename.length - 1].toLowerCase();
				}

				return Object.keys(this.types).find(type => this.types[type].indexOf(ext) > -1) || "file";
			});
	}
	getFiles(path) {
		path = this.getAbsolutePath(path);

		return this.fs.readDirectory(path)
			.then(files => {
				files = files.filter(file => {
					return file[0] != ".";
				});

				return ZeroPage.async.map(files, file => {
					return Promise.all([
						this.guessType((path ? path + "/" : "") + file),
						this.fs.isOptional((path ? path + "/" : "") + file),
						this.fs.isDownloaded((path ? path + "/" : "") + file)
					])
						.then(([type, optional, downloaded]) => {
							return {
								type: type,
								name: file,
								optional: optional,
								downloaded: downloaded
							};
						});
				});
			});
	}

	getAbsolutePath(path) {
		if(!this.root) {
			return path;
		}

		if(path) {
			return this.root + "/" + path;
		} else {
			return this.root;
		}
	}

	load(path) {
		let pathNode = document.getElementById("path");
		pathNode.innerHTML = "";
		let pathSplit = path ? path.split("/") : [];

		if(this.showRoot) {
			let fileNode;
			if(path) {
				fileNode = document.createElement("a");
				fileNode.href = "#/";
			} else {
				fileNode = document.createElement("span");
			}
			fileNode.textContent = this.showRoot;
			pathNode.appendChild(fileNode);
		}

		pathSplit.forEach((file, i) => {
			if(i > 0 || this.showRoot) {
				let delim = document.createElement("span");
				delim.innerHTML = this.shownPathDelim;
				pathNode.appendChild(delim);
			}

			let fileNode;
			if(i < pathSplit.length - 1) {
				fileNode = document.createElement("a");
				fileNode.href = "#/" + btoa(pathSplit.slice(0, i + 1).join("/"));
			} else {
				fileNode = document.createElement("span");
			}
			fileNode.textContent = file;
			pathNode.appendChild(fileNode);
		});

		return this.fs.getType(this.getAbsolutePath(path))
			.then(type => {
				if(type == "dir") {
					return this.loadDirectory(path);
				} else {
					return this.loadFile(path);
				}
			});
	}
	loadDirectory(path) {
		let filesNode = document.getElementById("files");
		filesNode.innerHTML = "";

		let loaded = false;
		let errorNode = null;
		setTimeout(() => {
			if(!loaded) {
				errorNode = this.showFileError(filesNode, "Loading...");
			}
		}, 500);

		return this.getFiles(path)
			.then(files => {
				loaded = true;
				if(errorNode) {
					errorNode.style.display = "none";
				}

				filesNode.innerHTML = "";

				files.forEach(file => {
					let fileNode = document.createElement("a");
					fileNode.className = "file" + (file.type == "dir" ? " file-dir" : "");
					fileNode.href = "#/" + btoa((path ? path + "/" : "") + file.name);

					if(file.optional && file.type != "dir") {
						let fileDownload = document.createElement("div");
						fileDownload.className = (file.downloaded ? "file-delete" : "file-download");
						fileDownload.title = (file.downloaded
							? "This file is marked as optional and was downloaded"
							: "This file is marked as optional and wasn't downloaded yet"
						);
						if(file.downloaded) {
							let clickFunc = e => {
								fileDownload.onclick = e => {
									e.preventDefault();
									e.stopPropagation();
								};
								fileDownload.classList.add("file-delete-inactive");

								this.fs.deleteFile(this.getAbsolutePath((path ? path + "/" : "") + file.name))
									.then(() => {
										fileDownload.title = "This file is marked as optional and wasn't downloaded yet";
										fileDownload.classList.remove("file-delete-inactive");
										fileDownload.classList.remove("file-delete");
										fileDownload.classList.add("file-download");
										fileDownload.onclick = e => {
											e.preventDefault();
											e.stopPropagation();
										};
									}, () => {
										fileDownload.onclick = clickFunc;
										fileDownload.classList.remove("file-delete-inactive");
									});

								e.preventDefault();
								e.stopPropagation();
							};
							fileDownload.onclick = clickFunc;
						} else {
							fileDownload.onclick = e => {
								e.preventDefault();
								e.stopPropagation();
							};
						}
						fileNode.appendChild(fileDownload);
					}

					let fileIconContainer = document.createElement("div");
					fileIconContainer.className = "file-icon-container";
					let fileIcon = document.createElement("img");
					fileIcon.className = "file-icon";
					fileIcon.src = "img/file/" + file.type + ".png";
					fileIconContainer.appendChild(fileIcon);
					fileNode.appendChild(fileIconContainer);

					let link = document.createElement("span");
					link.className = "file-name";
					link.textContent = file.name;
					fileNode.appendChild(link);

					filesNode.appendChild(fileNode);
				});
			});
	}
	loadFile(path) {
		let absolute = this.getAbsolutePath(path);

		let filesNode = document.getElementById("files");
		filesNode.innerHTML = "";

		return this.guessType(absolute)
			.then(type => {
				let contentNode = document.createElement("div");
				contentNode.className = "file-content";

				if(type == "image") {
					let image = document.createElement("img");
					image.className = "file-content-image";
					image.src = encodeURI(absolute);
					image.onerror = () => {
						image.onerror = null;
						image.style.display = "none";

						this.showFileError(contentNode, "File was removed or corrupted");
					};
					contentNode.appendChild(image);
				} else if(type == "text") {
					let loaded = false;

					let node = null;
					setTimeout(() => {
						if(!loaded) {
							node = this.showFileError(contentNode, "Loading...");
						}
					}, 500);

					this.fs.readFile(absolute)
						.then(content => {
							loaded = true;
							if(node) {
								node.style.display = "none";
							}

							let text = document.createElement("div");
							text.className = "file-content-text";
							text.textContent = content;
							contentNode.appendChild(text);
						});
				} else if(type == "video") {
					let video = document.createElement("video");
					video.className = "file-content-video";
					video.src = encodeURI(absolute);
					video.controls = true;
					video.onerror = () => {
						video.onerror = null;
						video.style.display = "none";

						this.showFileError(contentNode, "File was removed or corrupted");
					};
					contentNode.appendChild(video);
				} else if(type == "music") {
					let music = document.createElement("audio");
					music.className = "file-content-music";
					music.src = encodeURI(absolute);
					music.controls = true;
					music.onerror = () => {
						music.onerror = null;
						music.style.display = "none";

						this.showFileError(contentNode, "File was removed or corrupted");
					};
					contentNode.appendChild(music);
				} else if(type == "file") {
					let loaded = false;

					let node = null;
					setTimeout(() => {
						if(!loaded) {
							node = this.showFileError(contentNode, "Loading...");
						}
					}, 500);

					this.fs.readFile(absolute)
						.then(content => {
							loaded = true;
							if(node) {
								node.style.display = "none";
							}

							let text = document.createElement("div");
							text.className = "file-content-text";
							text.innerHTML = binaryToText(content);
							contentNode.appendChild(text);
						});
				}

				filesNode.appendChild(contentNode);
			});
	}
	showFileError(contentNode, html) {
		let text = document.createElement("div");
		text.className = "file-content-error";
		text.innerHTML = html;
		contentNode.appendChild(text);
		return text;
	}
};