# lagobello-www-hugo-universal
Public hugo website for https://www.lagobello.com/  


# Editing using git
## Pre-requisites
Git should be installed and in PATH  
Hugo should be installed and in PATH  

## Clone the repository using git
Enter the following commands one-by-one in a git shell, bash shell, or Powershell.  
`git clone --recurse-submodules https://github.com/lagobello/lagobello-www-hugo-universal.git`  <sup>1</sup>  

<sup>1</sup> The `--recurse-submodules` flag is necessary to download themes from their individual git repositories.  

## Test web server locally using git
`cd lagobello-www-hugo-universal`  
`hugo server`  

At this point the web page should be accessible through a browser and properly rendered.  

## How to make modifications to the website using git
Perform modifications using your text editor of choice, run the `git add` command to add modified files to the commit, run the `git commit` command to commit modifications to the local repository, and finally run the `git push` command to upload modifications to remote server.  

`git add path/to/modified/file`  
`git add -u`  
`git commit -m "I modified file for improvements"`  
`git push`  