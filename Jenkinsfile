pipeline {
    agent any

    environment {
        NODE_HOME = tool(name: 'NodeJS', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation')
        PLAYWRIGHT_BROWSERS_PATH = '0'
        BUGASURA_TEAM_ID = '107849'
        BUGASURA_SPRINT_ID = '161858'
        BUGASURA_API_URL = 'https://api.bugasura.io/api/v1/issues'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                echo 'Installing Node.js dependencies...'
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                echo 'Running ESLint...'
                sh 'npm run lint'
            }
        }

        stage('Build') {
            steps {
                echo 'Building Next.js application...'
                sh 'npm run build'
            }
        }

        stage('Unit Tests') {
            steps {
                echo 'Running Jest unit tests...'
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'junit-jest.xml'
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Unit Test Coverage'
                    ])
                }
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                echo 'Installing Playwright browsers...'
                sh 'npx playwright install chromium firefox webkit'
            }
        }

        stage('E2E Tests') {
            steps {
                echo 'Running Playwright E2E tests...'
                sh 'npx playwright test'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright E2E Report'
                    ])
                    archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
                }
            }
        }

        stage('Publish Failures to Bugasura') {
            when {
                // Only run after the previous test stages have at least produced artifacts;
                // the script itself exits 0 with no calls when there are no failures.
                expression { fileExists('junit-jest.xml') || fileExists('playwright-report/junit.xml') }
            }
            steps {
                withCredentials([string(credentialsId: 'bugazura-token', variable: 'BUGASURA_API_KEY')]) {
                    sh '''
                        node scripts/publish-to-bugasura.mjs \
                            --junit-jest=junit-jest.xml \
                            --junit-playwright=playwright-report/junit.xml \
                            --build=${BUILD_NUMBER} \
                            --job=${JOB_NAME} \
                            --build-url=${BUILD_URL} \
                            --report-url=${BUILD_URL}artifact/playwright-report/
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
            cleanWs()
        }
        success {
            echo 'All stages passed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the logs for details.'
        }
    }
}