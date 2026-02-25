#!/bin/bash

# If update_data is passed as an argument, get the data from the statbel website and rebuild the data
if [ "$1" = "update_data" ]; then
    echo "Updating data"
    wget https://statbel.fgov.be/sites/default/files/files/opendata/Indexen%20per%20productgroep/CPI%20All%20groups.xlsx
    mv "CPI All groups.xlsx" "../../données statbel"
    python prepare_data.py
fi

# Build and cp the build to the blog folder
npm run build
# add clouflare analytics
sed -i "s|</html>|<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"05b4282391484b1ba19c5fa3458aa5a6\"}'></script><!-- End Cloudflare Web Analytics --></html>|" build/index.html
rm -rf "/home/robin/Dropbox/Projets divers/blog/rdevooght.github.io/posts/search-inflation/static"
cp -r build/* "/home/robin/Dropbox/Projets divers/blog/rdevooght.github.io/posts/search-inflation/" 