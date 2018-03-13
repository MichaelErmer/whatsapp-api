node {
  properties([
    parameters([
      booleanParam(
        defaultValue: true,
        description: 'Should slack be notified?',
        name: 'reportToSlack'
      ),
      booleanParam(
        defaultValue: true,
        description: 'Cleanup Workspace after successfull build?',
        name: 'cleanupWorkspace'
      ),
    ])
  ])
  checkout scm
  result = sh (script: "git log -1 | grep '\\[CI-NOBUILD\\]'", returnStatus: true)
  if (result != 0) {
      try {
        stage("Prepare environment") {
          docker.image('registry.df-srv.de/contactimpact/node-ci:6').inside {
            stage("Install Dependencies") {
              sh 'git clone git+ssh://git@github.com/contactimpact/ci-scripts scripts'
              if (params.reportToSlack) slackSend color: 'grey', message: "started ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
              sh "npm install"
            }
            stage("Test and validate") {
              sh "npm test"
            }
            if (env.BRANCH_NAME == "dev") {
              stage("Publish"){
                slackSend color: 'good', message: "What type of release is it? ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
                choice = new ChoiceParameterDefinition('Release Type', ['none', 'patch', 'minor', 'major'] as String[], '')
                def userInput = ""
                def didTimeout = false
                try {
                    timeout(time: env.RELEASETIMEOUT.toInteger(), unit: 'SECONDS') {
                      userInput = input(id: 'userInput', message: 'What type of release is it?', parameters: [choice])
                    }
                } catch (err) {
                    def user = err.getCauses()[0].getUser()
                    if('SYSTEM' == user.toString()) { // SYSTEM means timeout.
                        didTimeout = true
                    } else {
                        userInput = false
                        echo "Aborted by: [${user}]"
                    }
                }
                if (!didTimeout && userInput != false && userInput != "" && userInput != "none") {
                    echo ("Releasing new " + userInput);
                    env.RTYPE = userInput
                    tokens = "${env.JOB_NAME}".tokenize('/')
                    org = tokens[0]
                    repo = tokens[1]
                    env.RPACKAGE = repo
                    branch = tokens[2]
                    sh "git remote set-url origin git@github.com:${org}/${repo}.git"
                    sh 'git checkout -b master'
                    sshagent(credentials: ['ermi-github-ssh']) {
                      def versions = sh(script: "./scripts/increaseVersion.sh "+userInput, returnStdout: true).trim()
                      echo versions
                      versions = versions.tokenize('|')
                      env.RVERSION = versions[0]
                      env.RMAJOR = versions[1]
                      env.RMINOR = versions[2]
                      slackSend color: 'good', message: "Realeased new ${userInput} ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
                      sh 'git checkout -b dev'
                      sh 'git merge master'
                      sh 'git push -u origin dev master'
                    }
                } else {
                  echo "Not Publishing"
                }
              }
            }
          }
        }
        if (env.BRANCH_NAME == "dev") {
            if (fileExists('Dockerfile') && env.RTYPE) {
              stage("Publish to docker") {

                  def dockerName = env.RPACKAGE.toLowerCase();
                  //echo sh("./scripts/dockerRelease.sh "+dockerName+" "+env.RVERSION)
                  docker.withRegistry('https://registry.df-srv.de/', 'registry.df-srv.de') {
                      def image = docker.build("registry.df-srv.de/contactimpact/"+dockerName+":"+env.RVERSION)
                      image.push()
                      image.push(env.RMAJOR)
                      image.push(env.RMINOR)
                      image.push('latest')
                  }

              }
            }
        }
        stage('Cleanup'){
          if (params.reportToSlack) slackSend color: 'good', message: "success ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
          if (params.cleanupWorkspace) cleanWs()
          currentBuild.result = "SUCCESS"
        }
      } catch (err) {
        currentBuild.result = "FAILURE"

        if (params.reportToSlack) slackSend color: 'bad', message: "error ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
        cleanWs()
        throw err
      }
  }
}
