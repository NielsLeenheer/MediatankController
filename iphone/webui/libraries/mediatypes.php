<?php


class MediaTypes {

	function localPlaybackAllowed($file) {
		switch(end(explode(".", $file))) {
			case 'mov':
			case 'mp4':
			case 'm4v':
			case 'm4a':
			case 'mp3':
			case 'wav':
				return true;
		}
		
		return false;
	}

	function isHidden($file) {
		$file = basename($file);
		
		if (substr($file, 0, 1) == '.') 
			return true;
		
		switch (strtolower($file)) {
			case 'network_browser':
			case 'network_share':
			case 'lost+found':
			case 'audio_ts':
			case '_theme_':
			case '$recycle.bin':
				return true;
		}
				
		return false;
	}
	
	function isPlaylist($file) {
        switch(end(explode(".", $file))) {
            case 'jsp':
            case 'pls':
                return true;
        }
        
        return false;
    } 

	function isVideo($file) {
		switch(end(explode(".", $file))) {
			case 'mkv':
			case 'avi':
			case 'asf':
			case 'wmv':
			case 'mov':
			case 'mp4':
			case 'm4v':
			case 'mpg':
			case 'ts':
			case 'vob':
			case 'dat':
			case 'mpeg':
			case 'divx':
				return true;
		}
		
		if (MediaTypes::isDVD($file)) {
			return true;
		}
				
		return false;
	}
			
	function isDVD($file) {
		if (strtolower(substr($file, -8)) == 'video_ts') {
			return true;
		}
		
		if (MediaTypes::isISO($file)) {
			return true;
		}
		
		return false;
	}

	function isISO($file) {
		if (strtolower(substr($file, -4)) == '.iso') {
			return true;
		}
		
		return false;
	}

	function isAudio($file) {
		switch(end(explode(".", $file))) {
			case 'mp3':
			case 'm4a':
			case 'wma':
			case 'aac':
			case 'ac3':
			case 'dts':
			case 'wav':
			case 'pcm':
			case 'flac':
				return true;
		}
		
		return false;
	}

	function isVisible($file) {
        return MediaTypes::isPlaylist($file) || MediaTypes::isVideo($file) || MediaTypes::isAudio($file);
	}
}


?>