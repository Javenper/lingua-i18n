const Lang = {
    projectName: "Current Lingua-i18n. Ultra light i18n Engine",
    version: "1.2.0",
    githubUrl: "https://github.com/Javenper/lingua-i18n",
    languages: "",
    dictionary: {},
    buildUrl: function(base, path) {
        const cleanBase = base.replace(/\/$/, '');
        const cleanPath = path.replace(/^\//, '');
        return `${cleanBase}/${cleanPath}`;
    },
    loadDictionaryFiles: function (callback) {
        this.languages = lang.startsWith('es') ? ['es'] : ['en'];

        // Obtener la URL base del sitio
        const baseUrl = BASE_URL || window.location.origin;
        
        this.languages.forEach((language) => {

            const jsonUrl = this.buildUrl(baseUrl, `/Scripts/Idiomas/${language}.json`);

            fetch(jsonUrl)
                .then((response) => response.json())
                .then((data) => {
                    this.dictionary[language] = data;
                    if (Object.keys(this.dictionary).length === this.languages.length) {
                        callback(this.dictionary, language);
                    }
                });
        });
    },
    initializeLanguages: function () {
        try {
            this.loadDictionaryFiles((dictionary, language) => {
                $.jqi18n.setDictionary(dictionary[language], language);
            });
        }
        catch (err) {
            if (err) return console.log('something went wrong loading', err);
        }
        console.log("Diccionario de idiomas inicializado.");        
    },
    updateLanguage: function (elementContainer) {
        $.jqi18n.init({
            locale: this.languages,
            dictionaries: this.dictionary//,
            //path: "/Translation/"
        });
        $(elementContainer).find('[data-i18n]').each(function () {
            const key = $(this).attr('data-i18n');
            $.jqi18n.translateElement(this, key);
        });
    },
    getLabel: function (key, options) {
        var response = '';
        if (options) {
            response = $.jqi18n.translateCompounds(key, options);
            return response;
        }
        response = $.jqi18n.translate(key);
        return response;
    }
};

document.addEventListener("DOMContentLoaded", function () {
    // Verificación de seguridad por si jqi18n tarda un milisegundo más en acoplarse
    if ($.jqi18n) {
        Lang.initializeLanguages();
    } else {
        // Reintento controlado si hay retraso en el DOM
        setTimeout(function () {
            if ($.jqi18n) Lang.initializeLanguages();
        }, 200);
    }
});
