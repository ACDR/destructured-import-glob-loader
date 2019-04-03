/* vim: set ts=4 sw=4 noet: */
import loaderUtils from 'loader-utils';
import glob from 'glob';

const quotedString = /(['"])(.*?)\1/;
const trailingSlash = /\/$/;

export default function importGlob(source) {
	this.cacheable();
	const options = loaderUtils.parseQuery(this.query);
	options.sync = true;

	let { test = "import", delimiter = '\n' } = options;
	const qualifier = /import {[^;]+}.*?(\'.*?\*');/gm;

	function expandGlob(result) {
		if (!result) return;
		const [match, quote, content] = result;
		const offset = result.index;
		const line = result.input;

		if (!glob.hasMagic(content)) return;

		let pre = line.slice(0, offset);

		let names = pre.slice(pre.indexOf("{") + 1,pre.indexOf("}"));
		names = names.replace(/\s/g, '');
		names = names.split(',');
		names = names.sort();

		options.cwd = this.context;
		const dirGlob = new glob.Glob(
			trailingSlash.test(content) ?  content : `${content}/`, options);

		dirGlob.found
		.forEach(directory => this.addContextDependency(directory));

		const fileOptions = Object.create(options);
		if (!options.hasOwnProperty('nodir')) {
			fileOptions.nodir = true;
		}
		fileOptions.cwd = this.context;
		fileOptions.cache = dirGlob.cache;
		fileOptions.statCache = dirGlob.statCache;

		return glob.sync(content, options)
			.map((filename, index) => {
				if (names[index].indexOf('//') > -1) {
					return '';
				}

				return `import ${names[index]} from ${quote}${filename}${quote};`
			}).join(delimiter);
	}

	function expandLine(line, payload) {
		if (!(payload && payload.trim())) return line;
		return expandGlob.call(this, quotedString.exec(line)) || line;
	}

	return source.replace(qualifier, expandLine.bind(this));
}
