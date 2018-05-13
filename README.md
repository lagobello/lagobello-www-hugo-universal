# lagobello-www-hugo-universal
Public hugo website for https://lagobello.com currently hosted at https://lagobello.github.io/


# For easy editing
Go to https://forestry.io/ for a wysiwig editor with easy deployment to gh-pages branch  

# Editing using git
## Pre-requisites
Git should be installed and in PATH  
Hugo should be installed and in PATH  

## Clone the repository using git
Enter the following commands one-by-one in a git shell, bash shell, or Powershell.  
`git clone --recurse-submodules https://github.com/lagobello/lagobello-www-hugo-universal.git`  <sup>1</sup>  

<sup>1</sup> The `--recurse-submodules` flag is necessary to bring down themes from their individual repositories.  

## Test web server locally using git
`cd lagobello-www-hugo-universal`  
`hugo server`  

At this point the web page should be accessible through a browser and properly rendered.  

## How to modify hugo code using git
Perform modification using your text editor of choice, run the `git add` command to add modified files to the commit, run the `git commit` command to perform the commit to the local repository.  

`git add path/to/modified/file`  
`git add -u`  
`git commit -m "I modified path/to/modified/file"`  
`git push`  

## How to make modifications "go live"
Run following script to transparently commit public folder to https://github.com/lagobello/lagobello.github.io
`./deploy.sh`  

Push modification to GitHub.  
`git push upstream gh-pages`  
