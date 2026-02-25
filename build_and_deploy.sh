#!/bin/bash

# If update_data is passed as an argument, get the data from the statbel website and rebuild the data
if [ "$1" = "update_data" ]; then
    echo "Updating data"
    wget https://statbel.fgov.be/sites/default/files/files/opendata/Indexen%20per%20productgroep/CPI%20All%20groups.xlsx
    mv "CPI All groups.xlsx" "../../données statbel"
    uv run prepare_data.py
fi

# Build and cp the build to the blog folder
npm run build
# add clouflare analytics
sed -i "s|</html>|{% include 'analytics.njk' %}</html>|" build/index.html
sed -i "s|https://blog\.robindevooght\.be/posts/search-inflation/|{{ metadata.url }}{{page.url}}|g" build/index.html
sed -i "s#https://blog\.robindevooght\.be/\([^\"]*\)#{{ '/\1' | url }}#g" build/index.html
sed -i "s#https://blog\.robindevooght\.be#{{ '/' | url }}#g" build/index.html
rm -rf "/home/robin/Dropbox/Projets divers/blog/rdevooght.github.io/posts/search-inflation/static"
cp -r build/* "/home/robin/Dropbox/Projets divers/blog/rdevooght.github.io/posts/search-inflation/"
mv "/home/robin/Dropbox/Projets divers/blog/rdevooght.github.io/posts/search-inflation/index.html" "/home/robin/Dropbox/Projets divers/blog/rdevooght.github.io/posts/search-inflation/index.njk"
