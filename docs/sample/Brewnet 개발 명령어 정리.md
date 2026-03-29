Brewnet 개발 명령어 정리                                                                                                                                                        
                                                                                                                                                                                  
  빌드                                                                                                                                                                            
                                                                                                                                                                                  
  # 전체 빌드 (루트에서)                                                                                                                                                          
  cd ~/Claude-Code-Expert/brewnet                                                                                                                                                 
  pnpm build                                                                                                                                                                      
                                                                                                                                                                                  
  # CLI만 빌드                                                                                                                                                                  
  pnpm --filter @brewnet/cli build

  ---
  글로벌 설치 / 재설치

  # 빌드 후 글로벌 링크 (소스 변경 반영)
  cd ~/Claude-Code-Expert/brewnet
  pnpm build
  pnpm install -g packages/cli
  # 또는
  npm install -g packages/cli

  ---
  어드민 서버 소스 변경 반영

  # 1. 빌드
  pnpm --filter @brewnet/cli build

  # 2. 실행 중인 어드민 서버 종료
  pkill -f "brewnet admin"

  # 3. 재시작
  brewnet admin

  ---
  언인스톨 (서비스 제거)

  # 설치된 서비스 제거
  brewnet uninstall

  # 글로벌 CLI 제거
  pnpm remove -g brewnet

  ---
  설치 (init)

  brewnet init

  ---
  자주 쓰는 조합

  # 소스 수정 → 테스트까지 한번에
  pnpm build && pkill -f "brewnet admin"; brewnet admin

  # 클린 빌드
  pnpm clean && pnpm build