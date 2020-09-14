import React, { Component } from 'react';
import { navigate } from '@reach/router';
import { Button } from 'rimble-ui';
import styled from 'styled-components';

import JoinPromptModal from './JoinPromptModal';
import BuyinPromptModal from './BuyInPromptModal';
import SkeletonLeaderboardLoader from './SkeletonLeaderboardLoader';

import { getTournamentResult, getTournament, getGameNo, getGameSessionId, getTournaments } from '../helpers/database'
import shortenAddress from "../core/utilities/shortenAddress";
import { Constants } from '@game3js/common';
import web3 from 'web3';
import qs from 'querystringify';
import { format } from 'date-fns';

import CSS from 'csstype';
import { baseColors, fonts, shadows, } from '../styles';

import {
  TOURNAMENT_STATE_ACTIVE,
  TOURNAMENT_STATE_ENDED,
  TOURNAMENT_STATE_DRAFT
} from '../constants'

const SharesText = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .place {
    font-family: 'Apercu Bold', sans-serif;
    font-weight: bold;
    width: 33%;
  }

  .trophy {
    width: 33%;
    text-align: center;
  }
  
  .share {
    width: 33%;
    text-align: right;
  }
`;

// Container for individual results
const ResultStyle = styled.div`
 display: flex;
 justify-content: space-between;
 align-items: center;
 font-family: 'Apercu Pro Mono';
 font-size: 0.825rem;
 letter-spacing: 0.1px;
 padding: 0.5rem;

 .address {
   font-weight: bold;
   margin: 0;
 }

 .shares {
   margin: 0 0 0 1rem;
   width: 32%;
   text-align: left;
 }

 .score {
   color: #0093d5;
   margin: 0;
   text-align: right;
   width: 33%;
 }

 .player-background {
   background: #c4c4c4;
 }
 `

const JoinTourneyBtn = styled(Button)`
  font-family: 'Apercu Light';
  font-size: 0.825rem;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  width: 100%;
 `

 const JoinLeaderboardsMsg = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
 `

 const WidgetStyle = styled.div`
  color: #101010;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100%;
 `

 const LeaderboardStyle = styled.div`
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin-bottom: 0.75rem;
  padding: 1rem;
  width: 100%;

  .title-header {
    color: ${baseColors.dark};
    font-family: 'Apercu Bold';
    margin-bottom: 1rem;
    text-align: center;
    text-transform: uppercase;
  }
 `

//  Used inside <LeaderboardStyle>
 const ResultDivsStyle = styled.div`
  display: flex;
  justify-content: center;
  flex-direction: column;
  padding: 0;
  width: 100%;
 `

 const TournamentInfoStyle = styled.div`
  background: #ffb600;
  border-radius: 7px 7px 0 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 1rem;
  width: 100%;

  .tourney-title {
    font-size: 1.5rem;
    font-family: 'Apercu Bold';
    margin: 5px;
  }

  .tourney-title-info {
    font-size: 1rem;
  }
 `

 const TotalBuyInContainer = styled.div`
  background: #06df9b;
  border: none;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  outline: none;
  font-size: 1rem;
  padding: 1rem 0.75rem;
  width: 100%;

  .total-buyin {
    font-family: 'Apercu Bold';
    font-size: 1.5rem;
  }
 `

 interface IState {
  results: Array<any>;
  tournament: any;
  shares: Array<any>;
  isLoading: boolean;
  isJoinModalOpen: boolean;
  isBuyinModalOpen: boolean;
  accountBuyIn: number;
  gameNo: number;
 }

 interface IProps {
   tournamentId: any;
   address: any;
   playerAddress: any;
   drizzle: any;
   accountValidated: any;
   connectAndValidateAccount: any;
 }

class TournamentResultsCard extends Component<IProps, IState> {
  constructor(props) {
    super(props)

    this.state = {
      results: [],
      tournament: {},
      isLoading: false,
      shares: [],
      isJoinModalOpen: false,
      isBuyinModalOpen: false,
      accountBuyIn: 0,
      gameNo: 0
    }

    this.handleCloseJoinModal = this.handleCloseJoinModal.bind(this);
    this.handleOpenJoinModal = this.handleOpenJoinModal.bind(this);
    this.handleCloseBuyinModal = this.handleCloseBuyinModal.bind(this);
    this.handleOpenBuyinModal = this.handleOpenBuyinModal.bind(this);
  }

  componentDidMount() {
    this.getBlockchainInfo(this.props)
  }

  componentWillReceiveProps(newProps) {
    const { tournamentId, address } = this.props
    const { tournamentId: newId, address: newAddress } = newProps

    if (tournamentId !== newId || address !== newAddress) {
      this.getBlockchainInfo(newProps)
    }
  }

  parseData(data) {
    console.log("The data is", data)
    return data.split(' ').join('').split(",");
  }

  async getTournamentAndLeaderBoards(tournamentId: any, loggedIn: boolean) {
    const { drizzle, playerAddress, accountValidated } = this.props;

    this.setState({ isLoading: true })

    console.log(`getBlockchainInfo: ${tournamentId}`)
    const contract = drizzle.contracts.Tournaments;
    let results = [];
    let tournament = {
      id: '',
      name: '',
      gameStage: undefined,
      timeZone: '',
      startTime: '',
      endTime: '',
      startDate: '',
      endDate: '',
      state: 0,
      pool: '',
      maxTries: 0,
      buyInAmount: 0
    }

    // Get tournament info

    if (tournamentId === undefined) {
      tournament = null

      return this.setState({
        results,
        tournament,
        isLoading: false
      })
    }

    let raw = undefined;
    if (loggedIn) {
      raw = await contract.methods.getTournament(tournamentId).call()
      await this.fetchShares(tournamentId);
      let data = this.parseData(raw['5']);
      const gameName = data[0];
      const gameStage = data[1] ? data[1] : undefined;
      const maxTries = await contract.methods.getMaxTries(tournamentId).call();
      const tournamentBuyIn = await contract.methods.getBuyIn(tournamentId).call();

      if (playerAddress && accountValidated) {
        const accountBuyIn = await contract.methods.buyIn(tournamentId, playerAddress).call();
        this.setState({ accountBuyIn });
      }

      tournament = {
        id: tournamentId,
        name: gameName,
        gameStage: gameStage,
        timeZone: 'GMT+8',
        startTime: '12:00',
        endTime: format(new Date(parseInt(raw['1'])), 'MMM d, yyyy'),
        startDate: '8/16',
        endDate: '9/4',
        state: parseInt(raw['3']),
        pool: raw['4'],
        maxTries: parseInt(maxTries),
        buyInAmount: tournamentBuyIn
      }

      this.fetchGameNo(playerAddress, tournamentId);
    } else {
      raw = await getTournament(tournamentId);
      console.log("TOURNAMENT DATA FROM DB", raw);
      let data = this.parseData(raw[0].data);
      let gameName = data[0];
      tournament = {
        id: tournamentId,
        name: gameName,
        gameStage: data[1] ? data[1] : undefined,
        timeZone: 'GMT+8',
        startTime: '12:00',
        endTime: format(new Date(parseInt(raw[0].endTime)), 'MMM d, yyyy'),
        startDate: '8/16',
        endDate: '9/4',
        state: parseInt(raw[0].state),
        pool: raw[0].pool,
        maxTries: 0,
        buyInAmount: 0,
      }
      console.log("FETCH SHARES NOT LOGGED IN", raw[0].shares);
      console.log("FETCH POOL NOT LOGGED IN", raw[0].pool);
      this.setState({
        shares: raw[0].shares
      })
    }

    // Get tournament results

    let sessionsData = await getTournamentResult(tournamentId);
    console.log("PLAYER ADD: sessionsData", sessionsData);

    if (sessionsData.length > 0) {
      for (let resultIdx = 0; resultIdx < (sessionsData.length > 10 ? 10 : sessionsData.length); resultIdx++) {
        let playerAddress = Object.keys(sessionsData[resultIdx].sessionData.playerData)[0];
        console.log("PLAYER ADD: address", playerAddress);

        results.push({
          gameName: sessionsData[resultIdx].sessionData.gameName,
          tournamentId: tournamentId,
          timeIsUp: false,
          playerAddress,
          sessionId: sessionsData[resultIdx].id,
          sessionData: sessionsData[resultIdx].sessionData.playerData[playerAddress]
        })
      }

      console.log("RESULTS:", results)
      results = results.filter(result => !!result.sessionData)
      if (results.length > 1) {
        // Sorts in ascending order
        results.sort((el1, el2) => {
          switch (el1.gameName) {
            case Constants.FP:
              return el2.sessionData.highScore - el1.sessionData.highScore
            case Constants.TOSIOS:
              return el1.sessionData.currentHighestNumber - el2.sessionData.currentHighestNumber
            case Constants.WOM:
              return el2.sessionData.currentHighestNumber - el1.sessionData.currentHighestNumber
            default:
              break;
          }
        })
      }
    }
    this.setState({
      results,
      tournament,
      isLoading: false
    })
  }

  getBlockchainInfo = async (props) => {
    const { tournamentId } = props

    if (this.props.drizzle.contracts.Tournaments) {
      const { drizzle } = this.props;
      // Get the latest tournament
      const contract = drizzle.contracts.Tournaments;

      console.log("TOURNAMENT ID = ", tournamentId)
      const tournamentLength = await contract.methods.getTournamentsCount().call();
      let tI = undefined;
      if (tournamentLength > 0) {
        tI = tournamentId || tournamentId === 0 ? tournamentId : tournamentLength - 1;
      }
      await this.getTournamentAndLeaderBoards(tI, true);
    } else {
      let ids = await getTournaments();
      console.log("IDSSSS", ids);
      let tId = undefined;
      if (ids.length > 0) {
        tId = ids[ids.length - 1].id
      }
      console.log("THE ID IN DB IS", tId);
      await this.getTournamentAndLeaderBoards(tId, false);
    }
  }

  getStatus(tournament: any) {
    switch (tournament.state) {
      case TOURNAMENT_STATE_DRAFT:
        return 'Draft'
      case TOURNAMENT_STATE_ACTIVE:
        return 'Active'
      case TOURNAMENT_STATE_ENDED:
        return 'Done'
      default:
        return 'None'
    }
  }

  formatTourneyTimeInfo(tournament: any) {
    const {
      startDate,
      endTime,
      startTime,
      timeZone
    } = tournament;
    let info =
      `Ends on ${endTime} ${timeZone}`;

    return info;
  }

  // Formats the title of the tournament along with its ID 
  formatTourneyTitle(tournament: any) {
    return `${tournament.name} #${tournament.id}`;
  }

  handleJoinClick = () => {
    const { tournament } = this.state;
    let options = {};

    switch (tournament.name) {
      case Constants.WOM:
        navigate(`/game/wom${qs.stringify(options, true)}`); //Join tourney for wom
        break;
      case Constants.TOSIOS:
        options = {
          mode: 'score attack',
          roomMap: 'small',
          roomMaxPlayers: '1',
          roomName: '',
          tournamentId: tournament.id,
          playerName: "Guest",
          viewOnly: tournament.timeIsUp
        }
        navigate(`/game/new${qs.stringify(options, true)}`);
        break;
      case Constants.FP:
        options = {
          tournamentId: tournament.id,
          viewOnly: tournament.timeIsUp
        }
        navigate(`/game/flappybird${qs.stringify(options, true)}`); //Join tourney for flappy bird
        break;
      default:
        break;
    }
  }

  setResultBgColor(playerAddress, currentPlayerAddress) {
    if (playerAddress && playerAddress.toLowerCase() === currentPlayerAddress.toLowerCase()) {
      return baseColors.lightGrey;
    } else {
      return baseColors.white;
    }
  }

  fetchShares = async (tournamentId) => {
    console.log("FETCH SHARES");
    const { drizzle } = this.props;

    try {
      const contract = drizzle.contracts.Tournaments;
      const shares = await contract.methods.getShares(tournamentId).call();
      this.setState({ shares });
    }
    catch (e) { }
  }

  setTrophy(idx, shares) {
    if (idx < shares.length) {
      switch (idx) {
        case 0:
          return <span>&#x1F947;</span>
        case 1:
          return <span>&#x1F948;</span>
        case 2:
          return <span>&#x1F949;</span>
      }
    }
  }

  setDisplayScore(result) {
    switch (result.gameName) {
      case Constants.FP:
        return result.sessionData.highScore
      case Constants.TOSIOS:
        return this.formatTime(result.sessionData.currentHighestNumber, true)
      default:
        return ''
    }
  }

  formatTime = (time, isLeaderBoards) => {
    if (time) {
      const seconds = (parseInt(time) / 1000).toFixed(2);
      const minutes = Math.floor(parseInt(seconds) / 60);
      let totalTime = '';
      if (parseInt(seconds) > 60) {
        let sec = (parseInt(seconds) % 60).toFixed(2);

        totalTime += isLeaderBoards ? (minutes + ":" + sec).toString() : (minutes + "min" + " " + sec + "sec").toString()
      } else {
        totalTime += isLeaderBoards ? ("0:" + seconds).toString() : (seconds + "sec").toString()
      }
      return totalTime
    }
  }

  handleCloseJoinModal = e => {
    this.setState({ isJoinModalOpen: false });
  }

  handleOpenJoinModal = e => {
    this.setState({ isJoinModalOpen: true });
  }

  handleCloseBuyinModal = e => {
    this.setState({ isBuyinModalOpen: false });
  }

  handleOpenBuyinModal = e => {
    this.setState({ isBuyinModalOpen: true });
  }

  fetchGameNo = async (account, tournamentId) => {
    const gameSessionId = await getGameSessionId(account, tournamentId);
    const gameNo = await getGameNo(gameSessionId, account, tournamentId);
    this.setState({ gameNo: gameNo });
  }

  render() {
    const { results, isLoading, tournament, shares, isJoinModalOpen, isBuyinModalOpen, gameNo, accountBuyIn } = this.state;
    const { tournamentId, playerAddress, accountValidated, connectAndValidateAccount, drizzle } = this.props;

    if (isLoading) {
      return (
        <SkeletonLeaderboardLoader />
      )
    }

    let resultDivs = null;

    if (results.length > 0) {

      resultDivs = results.map((result, idx) => {

        if (result.sessionData) {
          return (
            <ResultStyle className={playerAddress && playerAddress.toLowerCase() === result.playerAddress.toLowerCase() ? "player-background"  : ""}
              key={result.sessionId}
            >
              <p className="address" style={{ width: shares !== undefined ? '33%' : '50%' }}>
                {shortenAddress(result.playerAddress)}
              </p>
              {shares !== undefined && idx < shares.length ? (
                <p className="shares">{this.setTrophy(idx, shares)} {(parseInt(web3.utils.fromWei(tournament.pool)) * parseInt(shares[idx]) / 100)} ETH</p>
              ) : ""}
              <p className="score" style={{ width: shares !== undefined ? '33%' : '50%' }}>{result.sessionData && this.setDisplayScore(result)}</p>
            </ResultStyle>
          )
        }
      });
    } else {
      if (!tournamentId) {
        resultDivs = (
          <JoinLeaderboardsMsg>
            Join Tournament to be in leaderboards!
          </JoinLeaderboardsMsg>
        )
      } else {
        resultDivs = shares.map((share, idx) => {
          let place = <p className="place">{idx + 1}</p>;
          let trophy = <p className="trophy">{this.setTrophy(idx, shares)}</p>;
          let shareETH = <p className="share">{(parseInt(web3.utils.fromWei(tournament.pool)) * parseInt(share) / 100)} ETH</p>
          return (
            <SharesText key={idx}>{place}{trophy}{shareETH}</SharesText>
          )
        })
      }
    }

    const button = () => {
      if (accountBuyIn > 0 && playerAddress && accountValidated) {
        return (
          <JoinTourneyBtn
            onClick={this.handleJoinClick}
            mainColor={"#06df9b"}
            disabled={gameNo === tournament.maxTries ? "disabled" : ""}
          >
            {`Play ( ${typeof gameNo !== "number" ? 0 : gameNo} out of ${tournament.maxTries} )`}
          </JoinTourneyBtn>
        )
      } else {
        return (<JoinTourneyBtn
          onClick={playerAddress && accountValidated ? this.handleOpenBuyinModal : this.handleOpenJoinModal}
          mainColor={"#06df9b"}
        >
          {`Join ( ${tournament.buyInAmount && web3.utils.fromWei(tournament.buyInAmount.toString())} ETH )`}
        </JoinTourneyBtn>)
      }
    }

    return (
      <>
        <WidgetStyle>
          {!!tournament ? (
            <>
              <TournamentInfoStyle>
                {tournament.gameStage ? (
                  <h5 className="tourney-title">{tournament.gameStage}</h5>
                ) : (
                    <h5 className="tourney-title">{this.formatTourneyTitle(tournament)}</h5>
                  )
                }
                <p className="tourney-title-info">{this.formatTourneyTimeInfo(tournament)}</p>
                <p className="tourney-title-info">Status: {this.getStatus(tournament)}</p>
              </TournamentInfoStyle>

              <LeaderboardStyle>
                <h1 className="title-header">Leaderboard</h1>
                <ResultDivsStyle>
                  {resultDivs}
                </ResultDivsStyle>
              </LeaderboardStyle>

              <JoinPromptModal
                isOpen={isJoinModalOpen}
                handleCloseModal={this.handleCloseJoinModal}
                connectAndValidateAccount={connectAndValidateAccount}
                modalText={"You must be logged in to join a tournament"}
              />

              <BuyinPromptModal
                isOpen={isBuyinModalOpen}
                handleCloseBuyinModal={this.handleCloseBuyinModal}
                handleJoinClick={this.handleJoinClick}
                drizzle={drizzle}
                tournamentId={tournament.id}
                tournamentBuyInAmount={tournament.buyInAmount}
                maxTries={tournament.maxTries}
                address={playerAddress}
              />
              {tournamentId === undefined ? (
                button()
              ) : (
                  <TotalBuyInContainer>
                    <p>Total Buy-in Pool</p>
                    <h5 className="total-buyin">{tournament.pool && web3.utils.fromWei((tournament.pool).toString())} ETH</h5>
                  </TotalBuyInContainer>
                )}
            </>
          ) : (
              <TournamentInfoStyle>
                <h5 className="tourney-title">No Tournaments</h5>
              </TournamentInfoStyle>
            )}
        </WidgetStyle>
      </>
    )
  }
}

export default TournamentResultsCard;