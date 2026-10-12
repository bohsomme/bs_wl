# Search visibility

The public homepage targets BS-WL / BS Weightlifting and coach searches for
Børge Sømme / Børge Olsen-Hagen Sømme. Its visible English and Norwegian copy,
metadata, and WebSite / Person structured data describe the same offering.
The default server-rendered language is English. The Norwegian language switch
does not create a separately indexable Norwegian URL.

Canonical URLs are configured in `lib/site.ts`. Keep this set to the primary
public domain, never a preview deployment URL. Only the public homepage belongs
in the sitemap. Authentication and training pages have `noindex` metadata;
authentication remains responsible for protecting private data. Crawlers may
visit these pages to read their indexing instructions.

After deploying:

1. Confirm the primary domain serves the homepage publicly and other domain
   variants redirect to it. Check `/robots.txt` and `/sitemap.xml`.
2. Add the domain to Google Search Console and complete its ownership
   verification (a DNS TXT record is sufficient; no app changes are needed).
3. Submit `https://bs-weightlifting.com/sitemap.xml` and use URL Inspection to
   request indexing of the homepage. Check for deployment-level `noindex`
   headers or access protection if Google cannot index it.
4. Link the site from relevant public coach profiles and social accounts using
   its brand and coach name naturally.
5. Monitor indexing and search queries in Search Console. Crawling can take
   days to weeks; indexing and ranking are not guaranteed.

Broad terms such as "BS" and "weightlifting" require substantially more relevance
and competition analysis than brand searches. Do not add lists of keyword
combinations or deliberate misspellings such as "weigthlifting" to the copy.
Google does not use the keywords meta tag for indexing or ranking.

References:
- https://developers.google.com/search/docs/appearance/site-names
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://developers.google.com/search/docs/crawling-indexing/special-tags
