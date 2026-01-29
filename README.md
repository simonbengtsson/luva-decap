# Decap CMS as a Luvabase app

This is a custom version Decap CMS that can run as a Luvabase app. Use it to edit website content in a GitHub repository (Gitlab etc not supported) without having to setup Decap CMS. Just setup decap in your repo with a decapconfig.yml file and then [install this app](https://luvabase.com/dash?appUrl=https%3A%2F%2Fgithub.com%2Fsimonbengtsson%2Fluva-decap%2Freleases%2Flatest%2Fdownload%2Fapp.luva) and you are ready to go.

## How to use

1. Setup your website and add a decapconfig.yml file (here is an [example Vitepress site](https://github.com/simonbengtsson/luva-decap-vitepress), but it can be any site supported by Decap)
2. Install this app on Luvabase [Install Decap CMS](https://luvabase.com/dash?appUrl=https%3A%2F%2Fgithub.com%2Fsimonbengtsson%2Fluva-decap%2Freleases%2Flatest%2Fdownload%2Fapp.luva)
3. Open the app and follow the setup instructions (enter github api token)

## Development

You can run the app locally with `npm run dev` and create a new app file with `npm run build:app`.
