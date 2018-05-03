# lagobello-www-hugo
Public hugo website for https://www.lagobello.com currently hosted at https://vittorio88.github.io/lagobello-www-hugo/  


# For easy editing
Go to https://forestry.io/ for a wysiwig editor with easy deployment to gh-pages branch  

# Editing using git
## Pre-requisites
Git should be installed and in PATH  
Hugo should be installed and in PATH  

## Clone the repository using git
Enter the following commands one-by-one in a git shell, bash shell, or Powershell.  
`git clone --recurse-submodules https://github.com/vittorio88/lagobello-www-hugo-universal.git`  <sup>1</sup>  
`git remote rename origin upstream`  <sup>2</sup>  

<sup>1</sup> The `--recurse-submodules` flag is necessary to bring down themes from their individual repositories.  
<sup>2</sup> It is necessary to rename the remote from origin to upstream, so that a script to push to gh-pages branch works.    

## Test web server locally using git
`cd lagobello-www-hugo-universal`  
`hugo server`  

At this point the web page should be accessible through a browser and properly rendered.  

## How to modify hugo code using git
Perform modification using your text editor of choice, run the `git add` command to add modified files to the commit, run the `git commit` command to perform the commit to the local repository.  

`git add path/to/modified/file`  
`git add -u`  
`git commit -m "I modified path/to/modified/file"`  
`git push upstream master`  

## How to make modifications "go live"
Run following script to transparently commit public folder to local gh-pages branch using git worktrees.  
`./publish_to_ghpages.sh`  

Push modification to GitHub.  
`git push upstream gh-pages`  
